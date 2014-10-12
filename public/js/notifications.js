var notifications = (function(){
/**
 * Created by ken on 28/04/14.
 * 13/06/14 - Use SereneClient
 */
    var sereneServer;
    var freeTableData = [];

    function initGrid(gridId){

        // prepare the data
        var alldata = {};

        var data = [
            {condname: "table", condid: 2},
            {condname: "table", condid: 3}
        ];

        var detailsdata = [
            {condid: 2, condslotid: 44, condslot: "capacity", condval: 2, isvar: false},
            {condid: 2, condslotid: 50, condslot: "location", condval: "l2", isvar: true},
            {condid: 2, condslotid: 45, condslot: "status", condval: "free", isvar: false},
            {condid: 3, condslotid: 51, condslot: "capacity", condval: 3, isvar: false},
            {condid: 3, condslotid: 52, condslot: "location", condval: "l2", isvar: true},
            {condid: 3, condslotid: 53, condslot: "status", condval: "free", isvar: false}
        ];


        var subgridsId = [];

        var generateNewCondSlot = function (i) {
            var row = {};
            row["condslot"] = "";
            row["condval"] = "";
            row["isvar"] = false;
            row["condid"] = i | 0;
            row["condslotid"] = Math.floor(Math.random() * 100 );
            return row;
        };
        var generateNewCondition = function () {
            var row = {};
            row["condid"] = Math.floor(Math.random() * 100 );
            row["condname"] = "Condition "+ row["condid"];
            return row;
        };
        /*
         for (var i = 0; i < 10; i++) {
         var row = generaterow(i);
         detailsdata[i] = row;
         }
         */
        var rulesSource =
        {
            localdata: data,
            datatype: "local",
            datafields:
                [
                    { name: 'condid', type: 'number' },
                    { name: 'condname', type: 'string' }
                ]
        };
        var rulesDataAdapter = new $.jqx.dataAdapter(rulesSource);


        var nestedGrids = new Array();


        function initGridInner(){
            // create nested grid.
            var initrowdetails = function (index, parentElement, gridElement, record) {
                var id = record.uid.toString();
                var condid = record.condid.toString();
                var grid = $($(parentElement).children()[0]);
                nestedGrids[index] = grid;
                var filtergroup = new $.jqx.filter();
                var filter_or_operator = 1;
                var filtervalue = condid;
                var filtercondition = 'equal';
                var filter = filtergroup.createfilter('stringfilter', filtervalue, filtercondition);
                // fill the orders depending on the id.
                var conditionsForGrid = [];

                var currentConditions = detailsdata;

                for (var m = 0; m < currentConditions.length; m++) {
                    var result = filter.evaluate(currentConditions[m]["condid"]);
                    if (result){
                        conditionsForGrid.push(currentConditions[m]);
                    }
                }
                var conditionSlotsource = { datafields: [
                    { name: 'condid', type: 'number' },
                    { name: 'condslotid', type: 'number' },
                    { name: 'condslot', type: 'string' },
                    { name: 'condval', type: 'string' },
                    { name: 'isvar', type: 'bool' }
                ],
                    id: 'condslotid',
                    localdata: conditionsForGrid,
                    deleterow: function (rowid, commit) {
                        // synchronize with the server - send delete command
                        // call commit with parameter true if the synchronization with the server is successful
                        //and with parameter false if the synchronization failed.
                        debugger;
                        detailsdata.filter(function(slot){
                            return (slot.condid === rowid);
                        });
                        commit(true);
                    },
                    updaterow: function (rowid, newdata, commit) {
                        // synchronize with the server - send update command
                        // call commit with parameter true if the synchronization with the server is successful
                        // and with parameter false if the synchronization failed.
                        for (var i = 0; i < detailsdata.length; i++){
                            var condslot = detailsdata[i];
                            if (condslot.condid === newdata.condid &&
                                condslot.condslotid === rowid){
                                condslot.condslot = newdata.condslot;
                                condslot.condval = newdata.condval;
                                condslot.isvar = newdata.isvar;
                            }
                        }
                        commit(true);
                    },
                    addrow: function (rowid, newdata, position, commit) {
                        // synchronize with the server - send update command
                        // call commit with parameter true if the synchronization with the server is successful
                        // and with parameter false if the synchronization failed.
                        //debugger;
                        detailsdata.push(newdata);
                        commit(true);
                    }
                };
                var nestedGridAdapter = new $.jqx.dataAdapter(conditionSlotsource, {autoBind: true});
                if (grid != null) {
                    var condGrid = grid.jqxGrid({
                        source: nestedGridAdapter,
                        editable: true,
                        columns: [
                            { text: 'Table property', datafield: 'condslot', width: 180 },
                            { text: 'Value', datafield: 'condval', width: 180 },
                            { text: 'Is Variable', datafield: 'isvar', columntype: 'checkbox', width: 100}
                        ],
                        showtoolbar: true,
                        rendertoolbar: function (toolbar) {
                            var me = this;
                            var container = $("<div style='margin: 5px;'></div>");
                            toolbar.append(container);
                            container.append('<input id="naddrowbutton'+index+'" type="button" value="Add property" />');
                            container.append('<input style="margin-left: 5px;" id="ndeleterowbutton'+index+'" type="button" value="Delete selected property" />');
                            $("#naddrowbutton"+index).jqxButton();
                            $("#ndeleterowbutton"+index).jqxButton();

                            // create new row.
                            $("#naddrowbutton"+index).on('click', function () {
                                var datarow = generateNewCondSlot(condid);
                                var commit = condGrid.jqxGrid('addrow', null, datarow);
                            });
                            // delete row.
                            $("#ndeleterowbutton"+index).on('click', function () {
                                var selectedrowindex = condGrid.jqxGrid('getselectedrowindex');
                                var rowscount = condGrid.jqxGrid('getdatainformation').rowscount;
                                if (selectedrowindex >= 0 && selectedrowindex < rowscount) {
                                    var id = condGrid.jqxGrid('getrowid', selectedrowindex);
                                    var commit = condGrid.jqxGrid('deleterow', id);
                                    for (var k = 0; k< subgridsId.length; k++){
                                        if (k === id) break;
                                    }
                                    subgridsId.splice(k, 1);
                                }
                            });
                        }
                    });
                    subgridsId.push($(condGrid).attr("id"));
                }
            };

            // initialize jqxGrid
            var myGrid = $("#"+gridId).jqxGrid(
                {
                    width: 600,
                    height: 400,
                    source: rulesDataAdapter,
                    columns: [
                        { text: 'Condition Name', datafield: 'condname', width: 180 }
                    ],
                    editable:true,
                    editmode: 'dblclick',
                    rowdetails: true,
                    initrowdetails: initrowdetails,
                    rowdetailstemplate: { rowdetails: "<div id='grid' style='margin: 5px;'></div>",  rowdetailshidden: true },
                    showtoolbar: true,
                    rendertoolbar: function (toolbar) {
                        var me = this;
                        var container = $("<div style='margin: 5px; '></div>");
                        container.append('<input style="margin-right: 5px; width:80px;" id="rule-'+gridId+'" type="text" value="FreeTables" />');
                        container.append('<input style="margin-right: 5px; width: 49px;" id="rule-scope-'+gridId+'" type="text" value="group" />');
                        container.append('<input id="addrowbutton" type="button" value="New condition" />');
                        container.append('<input style="margin-left: 5px;" id="deleterowbutton" type="button" value="Delete selected" />');
                        container.append('<input style="margin-left: 5px;" id="updaterowbutton" type="button" value="Update selected" />');

                        toolbar.append(container);

                        $("#rule-"+gridId).jqxInput({placeHolder: "Rule name" , height: 23});
                        $("#addrowbutton").jqxButton();
                        $("#deleterowbutton").jqxButton();
                        $("#updaterowbutton").jqxButton();

                        // update row.
                        $("#updaterowbutton").on('click', function () {
                            var datarow = generateNewCondition();
                            var selectedrowindex = $("#"+gridId).jqxGrid('getselectedrowindex');
                            var rowscount = $("#"+gridId).jqxGrid('getdatainformation').rowscount;
                            if (selectedrowindex >= 0 && selectedrowindex < rowscount) {
                                var id = $("#"+gridId).jqxGrid('getrowid', selectedrowindex);
                                var commit = $("#"+gridId).jqxGrid('updaterow', id, datarow);
                                $("#"+gridId).jqxGrid('ensurerowvisible', selectedrowindex);
                            }
                        });
                        // create new row.
                        $("#addrowbutton").on('click', function () {
                            var datarow = generateNewCondition();
                            var commit = $("#"+gridId).jqxGrid('addrow', null, datarow);
                        });

                        // delete row.
                        $("#deleterowbutton").on('click', function () {
                            var selectedrowindex = $("#"+gridId).jqxGrid('getselectedrowindex');
                            var rowscount = $("#"+gridId).jqxGrid('getdatainformation').rowscount;
                            if (selectedrowindex >= 0 && selectedrowindex < rowscount) {
                                var id = $("#"+gridId).jqxGrid('getrowid', selectedrowindex);
                                var commit = $("#"+gridId).jqxGrid('deleterow', id);
                            }
                        });

                    },
                    showstatusbar: true,
                    renderstatusbar: function (statusbar) {
                        // appends buttons to the status bar.
                        var container = $("<div style='overflow: hidden; position: relative; margin: 5px;'></div>");
                        var saveButton = $("<div style='float: left; margin-left: 5px;'><img style='position: relative; margin-top: 2px;' src='/images/add.png'/>" +
                            "<span style='margin-left: 4px; position: relative; top: -3px;'>Add</span></div>");

                        container.append(saveButton);
                        saveButton.jqxButton({  width: 60, height: 20 });

                        statusbar.append(container);

                        saveButton.click(function (event) {
                            var rows = $('#'+ gridId).jqxGrid('getrows');
                            //populate all rows first
                            for (var i = 0; i< rows.length; i++){
                                var row = rows[i];
                                $('#'+gridId).jqxGrid('showrowdetails', i);
                                $('#'+gridId).jqxGrid('hiderowdetails', i);
                                alldata[row.condid] = {type: row.condname};
                            }
                            for (i = 0; i< subgridsId.length; i++){
                                var subrows = $('#'+ subgridsId[i]).jqxGrid('getrows');
                                if (!subrows[0])
                                    return;
                                //add to alldata
                                if (alldata[subrows[0].condid]){
                                    var slots = {};
                                    subrows.forEach(function(subrow){
                                           subrow.isvar ? slots[subrow.condslot] = "?" + subrow.condval:
                                               slots[subrow.condslot] = subrow.condval;
                                    });
                                    $.extend(alldata[subrows[0].condid], slots);
                                }
                            }
                            var rulename = $("#rule-"+gridId).val();
                            var scope = $("#rule-scope-"+gridId).val();

                            //send to server
                            registerRuleOnServer({rulename: rulename, scope: scope, conditions: alldata}, function(facts){
                                console.log("rule " + rulename + " called..");
                                console.dir(facts);
                            });
                        });

                        var resetButton = $("<div style='float: left; margin-left: 5px;'><img style='position: relative; margin-top: 2px;' src='/images/dragcancel.png'/>" +
                            "<span style='margin-left: 4px; position: relative; top: -3px;'>Reset</span></div>");
                        container.append(resetButton);
                        resetButton.jqxButton({  width: 60, height: 20 });

                        resetButton.click(function (event) {
                            resetNetworkOnServer();
                        });

                    }
                });
        }
        //init the window
        $("#dialogGrid").jqxWindow({
            resizable: true,
            //position: { left: $("#customNotification").offset().left + 10, top: $("#customNotification").offset().top - 60 },
            position: 'center',
            width: 610, height: 475,
            autoOpen: false,
            isModal: true,
            initContent: function(){
                initGridInner();
            }
        });
        $("#dialogGrid").css('visibility', 'visible');
        $("#dialogGrid").on('close', function () {

        });
        $("#dgcancelres").jqxButton({ height: 30, width: 80 });
        $("#dgcancelres").mousedown(function () {
            // close jqxWindow.
            $("#dialogGrid").jqxWindow('close');
        });

        //click event on button, show window
        $("#customNotification").on('click', function (event) {
            var args = event.args;

            // update the widgets inside jqxWindow.
            var dia = $("#dialogGrid");
            dia.jqxWindow('setTitle', "Make custom notification" );
            //position
            var x = ($(window).width() - dia.jqxWindow('width')) / 2 + $(window).scrollLeft();
            var y = ($(window).height() - dia.jqxWindow('height')) / 2 + $(window).scrollTop();

            dia.jqxWindow('open');
            //move the window
            dia.jqxWindow("move",x,y);


            event.preventDefault();
        });
    }

    function loadFactsOnGrid(facts) {
        //sanitize the data
        if (!facts) {
            return;
        }
        $("#freeTablesGridText").text("Some tables just got free at " + new Date(facts[0].slots[6].value));
        facts.forEach(function(fact){
            var obj = {};
            obj["type"] = obj.type;
            for (var i = 0; i < fact.slots.length; i ++){
                obj[fact.slots[i].type] = fact.slots[i].value;
            }
            freeTableData.push(obj);
        });
        var dataAdapter = new $.jqx.dataAdapter({
            localdata: freeTableData,
            datatype: "array"
        });
        var imagerenderer = function (row, datafield, value) {
            return '<img style="margin-left: 5px;" height="30" width="30" src="' + value + '"/>';
        };
        var daterenderer = function (row, datafield, value) {
            return '<span style="margin-left: 5px;" >' + new Date(value) + '<span/>';
        };
        $("#freeTablesGrid").jqxGrid(
            {
                width: 800,
                height: 250,
                source: dataAdapter,
                columns: [
                    { text: 'Name', datafield: 'name', width: 200 },
                    { text: 'Ppl', datafield: 'capacity', width: 50 },
                    { text: 'Location', datafield: 'location', width: 100 },
                    { text: 'Status', datafield: 'status', width: 100 },
                    { text: 'Pic', datafield: 'img', cellsrenderer: imagerenderer },
                    { text: 'Time free', datafield: 'stime', cellsrenderer: daterenderer}
                ]

            });
    }

    function parseUrlParams(param) {
        var match,
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
            query  = window.location.search.substring(1);

        var urlParams = {};
        while (match = search.exec(query))
            urlParams[decode(match[1])] = decode(match[2]);

        return param ? urlParams[param] : urlParams;
    }

    //---------- serena nteractions ------------
    function registerRuleOnServer(data){
        if (!sereneServer){
            console.err("Server not available..");
            return;
        }
        var ruleActivated = function(facts){  //rule fired
                console.info("Reteserve: A table is now free..");
                loadFactsOnGrid(facts);
        };

        sereneServer.registerRule(data,
            ruleActivated,
            null,   //rulefired scope
            function(status, msg){  //acknowledgement
                var span = $("#ruleRegisteredText");
                span.html(span.html() + "<br /> Server: " + msg);
                //close window
                $("#dialogGrid").jqxWindow('close');
            });
        sereneServer.onGroupRuleActivation(ruleActivated);
    }

    function initServerSocket(s){
        sereneServer = s;
    }

    return {
        init: function(gridId, server){
            initServerSocket(server);
            initGrid(gridId);
        },
        param: function (param){
            return parseUrlParams(param);
        }

    };
})();