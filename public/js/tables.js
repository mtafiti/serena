var tables = (function(){

    var serenaclient;
    // prepare the data
    function initTables(serena){

        initServer(serena);

var data = [
    {tableno: 1, name: "table 1", img: "/images/table.jpg", capacity: 2, location: "window" ,status: "occupied" },
    {tableno: 2, name: "table 2", img: "/images/table.jpg", capacity: 2, location: "terrace", status: "reserved" },
    {tableno: 3, name: "table 3", img: "/images/table.jpg", capacity: 2, location: "middle", status: "occupied" },
    {tableno: 4, name: "table 4", img: "/images/table.jpg", capacity: 3, location: "window", status: "reserved" },
    {tableno: 5, name: "table 5", img: "/images/table.jpg", capacity: 2, location: "private", status: "occupied" },
    {tableno: 6, name: "table 6", img: "/images/table.jpg", capacity: 2, location: "private", status: "reserved" },
    {tableno: 7, name: "table 7", img: "/images/table.jpg", capacity: 2, location: "middle", status: "reserved" }
];
var source =
{
    localData: data,
    dataType: "array",
    id: 'tableno'
};
var dataAdapter = new $.jqx.dataAdapter(source);
var itemsInCart = 0;
$("#dataTable").jqxDataTable(
    {
        width: 640,
        source: dataAdapter,
        sortable: true,
        pageable: true,
        pageSize: 4,
        pagerButtonsCount: 3,
        enableHover: false,
        selectionMode: 'none',

        columns: [
            {
                text: 'Tables', align: 'left', dataField: 'tableno',
                // row - row's index.
                // column - column's data field.
                // value - cell's value.
                // rowData - rendered row's object.
                cellsRenderer: function (rowData, column, value, rowData) {

                    //picture
                    var image = "<div style='margin: 5px; margin-bottom: 3px;'>";
                    var imgurl = '/images/' + "table" + '.jpg';

                    var img = '<img width="60" height="60" style="display: block;" src="' + imgurl + '"/>';
                    image += img;
                    image += "</div>";

                    var container = '<div style="width: 100%; height: 100%;">';
                    var leftcolumn = '<div style="float: left; width: 20%;">';
                    leftcolumn += image + "</div>";

                    var tablename = "<div style='margin: 10px;'><b>Table:</b> " + rowData.name + "</div>";
                    var tablecapacity = "<div style='margin: 10px;'><b>No of people:</b> " + rowData.capacity + "</div>";
                    var location = "<div style='margin: 10px;'><b>Location:</b> " + rowData.location + "</div>";

                    var freeButton = '<input id="freebutton-'+rowData.tableno+'" class="freebutton" row-id="'+rowData.tableno+'" type="button" value="Free" /> <br />';
                    var occButton = '<input id="occbutton-'+rowData.tableno+'" class="occupiedbutton"  row-id="'+rowData.tableno+'" type="button" value="Occupied" /> <br />';
                    var resButton = '<input id="resbutton-'+rowData.tableno+'" class="reservedbutton" row-id="'+rowData.tableno+'" type="button" value="Reserve" />';

                    var middlecolumn = '<div style="float: left; width: 35%;">';
                    middlecolumn += tablename;
                    middlecolumn += tablecapacity;
                    middlecolumn += location;
                    middlecolumn += "</div>";

                    var statusImage = "<div style='margin: 10px;'>"+ tableStatusImage(rowData)+"</div>";
                    var reservebutton = "<div style='margin: 10px;'><b>Status:</b> " + rowData.status + "</div>";

                    var middlerightcolumn = '<div style="float: left; width: 25%;">';
                    middlerightcolumn += statusImage;
                    middlerightcolumn += reservebutton;
                    middlerightcolumn += "</div>";

                    var rightcolumn = '<div style="float: left; width: 20%;">';
                    rightcolumn += freeButton + occButton + resButton + "</div>";

                    container += leftcolumn;
                    container += middlecolumn;
                    container += middlerightcolumn;
                    container += rightcolumn;
                    container += "</div>";

                    return container;
                }
            }],
        rendered: function(){
            //the data rows
            var rows = $("#dataTable").jqxDataTable('getRows');

            ﻿ // called when jqxDataTable is rendered.
            $(".freebutton").jqxButton({width: 100}).on('click', function (event) {
                editClick(event, "free");
            });

            $(".occupiedbutton").jqxButton({width: 100}).on('click', function (event) {
                editClick(event, "occupied");
            });
            $(".reservedbutton").jqxButton({width: 100}).click(function (event) {
                editClick(event, "reserved")
            });

            var editClick = function (event, status) {

                // end edit and cancel changes.
                var rowIndex = parseInt(event.target.getAttribute('row-id'));
                if (isNaN(rowIndex)) {
                    return;
                }

                var target = $(event.target);
                // get button's value.
                var value = target.val();
                // get clicked row.

                if (status === "reserve") {
                    //target.parent().find('.occupiedbutton').show();
                    //target.val("Save");
                }
                else {
                    // end edit and save changes.
                    //target.parent().find('.cancelButtons').hide();
                    //target.val("Edit");
                    //$("#dataTable").jqxDataTable('endRowEdit', rowIndex);
                    $("#dataTable").jqxDataTable('beginRowEdit', rowIndex);
                    var row = rows[rowIndex-1];
                    //set status
                    row.status = status;
                    saveTableStatusOnServer(row);

                    $("#dataTable").jqxDataTable('endRowEdit', rowIndex, true);

                }
            };
        },
        ready: function(){
            //init the window
            $("#dialog").jqxWindow({
                resizable: true,
                position: { left: $("#requestRes").offset().left + 10, top: $("#requestRes").offset().top - 10 },
                width: 300, height: 250,
                autoOpen: false
            });
            $("#dialog").css('visibility', 'visible');
            $("#dialog").on('close', function () {
                // enable jqxDataTable.
                $("#dataTable").jqxDataTable({ disabled: false });
            });
            $("#saveres").jqxButton({ height: 30, width: 80 });
            $("#cancelres").jqxButton({ height: 30, width: 80 });
            $("#cancelres").mousedown(function () {
                // close jqxWindow.
                $("#dialog").jqxWindow('close');
            });
            $("#saveres").mousedown(function () {
                // close jqxWindow.
                $("#dialog").jqxWindow('close');
                //get the client name also
                var clientName = $("#reservationName").val();
                var resvTime = $("#reservationTime").val();
                var resvLoc = $("#reservationLocation").val();
                var resvCap = + $("#reservationCapacity").val();    //convert to int

                var fact =  {type: "reservation-request",
                                name: clientName,
                                capacity: resvCap+"",
                                location:resvLoc,
                                time: resvTime};
                //send to server
                sendFactToServer(fact);

                $("#dataTable").jqxDataTable({ disabled: false });
            });

            $("#requestRes").on('click', function (event) {
                var args = event.args;

                // update the widgets inside jqxWindow.
                var dia = $("#dialog");
                dia.jqxWindow('setTitle', "Request for free table" );
                dia.jqxWindow('open');
                //dia.attr('data-row', index);
                $("#dataTable").jqxDataTable({ disabled: true });
                //$("#tableNo").val(row.tableno);
                //$("#tableName").html(row.name);
                //$("#tableImg").attr('src',row.img);
                //$("#tableCapacity").html(row.capacity);
                //$("#tableStatus").html(row.status);
                //$("#tableLocation").html(row.location);
                event.preventDefault();
            });
        }


    });

        //saving all facts on table
        $('#saveTableFacts').on('click', function(e){
            var rows = $("#dataTable").jqxDataTable('getRows');
            //save the rows to the server first
            rows.forEach(function(row){
                saveTableStatusOnServer(row);
            });

            e.preventDefault();
        });

    }


    function tableStatusImage(row){
        var statusImages = {
            free: "box_green.png",
            occupied: "box_red.png",
            reserved: "box_yellow.png"
        };

        var returnstr = "";
        returnstr += '<img id="table'+row.tableno+ '"';
        returnstr += ' width="60" height="60" style="display: block;" src="images/' + statusImages[row.status.toLowerCase()] + '"/>';

        return returnstr;
    }


    function saveTableStatusOnServer(data){
        if (!serenaclient) return;

        var slots = [];

        var keys = Object.keys(data);

        var slotsobj = {};
        for (var i=0; i< keys.length; i++){
            if (keys[i]==="uid" || keys[i]==="_visible")    //filter out html attributes
                continue;

            slotsobj[keys[i]] = data[keys[i]];
        }
        $.extend(slotsobj, {type: "table", scope: "group"});

        sendFactToServer(slotsobj);

    }
    function modifyTableStatusOnServer(data){
        if (!serenaclient) return;

        var slots = [];

        var keys = Object.keys(data);

        for (var i=0; i< keys.length; i++){
            if (keys[i]==="uid" || keys[i]==="_visible")    //filter out html attributes
                continue;
            slots.push({type: keys[i], val: data[keys[i]]});
        }
        var factData = {type: "table", slots: slots};

        modifyFactOnServer(factData);

    }


    function initServer(socket){
        //set server socket
        serenaclient = socket;

        var fnRuleActivated = function(rulename, facts){
            console.info("! A rule has been fired.." + rulename);
            console.dir(facts);
        };

        serenaclient.onGroupRuleActivation(fnRuleActivated);
        serenaclient.onPublicRuleActivation(fnRuleActivated);

    }

    function sendFactToServer(fact) {
        console.log("asserting fact to server..");
        serenaclient.assertFact(fact, function(err,res){
            console.log("..asserted a fact:");
            console.dir(res);
        });
    }

    function modifyFactOnServer(fact) {
        console.log("modifying fact to server..");
        serenaclient.modifyFact(fact, function(err,res){
            console.log("..modified a fact:");
            console.dir(res);
        });
    }

    return {
        initTables: initTables    };

})();

