
//Reteserve. Copyright 2013.

var reteserveJs =
    (function () {

        var serverSocket;
        var d3,     dagre;
        var NODE_COLORS = {
            RootNode: "#C0C0C0",
            ConstantNode: "#FFDEAD",
            KindNode: "#DDA0DD",
            AlphaMemory: "#00FA9A",
            BetaMemory: "#87CEFA",
            BetaNode: "﻿#ccffff",
            BetaTestNode: "﻿#FFD700",
            AlphaTestNode: "﻿#FFD700",
            NegationNode: "﻿#808080",
            TerminalNode: "#FFD700"
        };

        function initGrid(gridId){

            // prepare the data
            var alldata = {};

            var data = [
                {condname: "reservation-request", condid: 1},
                {condname: "table", condid: 2}
            ];

            var detailsdata = [
                {condid: 1, condslotid: 46, condslot: "location", condval: "l", isvar: true},
                {condid: 1, condslotid: 47, condslot: "name", condval: "n", isvar: true},
                {condid: 1, condslotid: 48, condslot: "time", condval: "t", isvar: true},
                {condid: 1, condslotid: 49, condslot: "capacity", condval: "c", isvar: true},
                {condid: 2, condslotid: 44, condslot: "capacity", condval: "c", isvar: true},
                {condid: 2, condslotid: 50, condslot: "location", condval: "l", isvar: true},
                {condid: 2, condslotid: 45, condslot: "status", condval: "free", isvar: false}
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
                            { text: 'Condition Slot', datafield: 'condslot', width: 180 },
                            { text: 'Condition Value', datafield: 'condval', width: 180 },
                            { text: 'Is Variable', datafield: 'isvar', width: 100 }
                        ],
                        showtoolbar: true,
                        rendertoolbar: function (toolbar) {
                            var me = this;
                            var container = $("<div style='margin: 5px;'></div>");
                            toolbar.append(container);
                            container.append('<input id="addrowbutton'+index+'" type="button" value="Add condslot" />');
                            container.append('<input style="margin-left: 5px;" id="deleterowbutton'+index+'" type="button" value="Delete selected condslot" />');
                            $("#addrowbutton"+index).jqxButton();
                            $("#deleterowbutton"+index).jqxButton();

                            // create new row.
                            $("#addrowbutton"+index).on('click', function () {
                                var datarow = generateNewCondSlot(condid);
                                var commit = condGrid.jqxGrid('addrow', null, datarow);
                            });
                            // delete row.
                            $("#deleterowbutton"+index).on('click', function () {

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
                    width: 850,
                    height: 350,
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
                        var container = $("<div style='margin: 5px;'></div>");
                        toolbar.append(container);
                        container.append('<input style="margin-right: 5px;" id="rule-'+gridId+'" type="text" value="My rule 1" />');
                        container.append('<input id="addrowbutton" type="button" value="New condition" />');
                        container.append('<input style="margin-left: 5px;" id="deleterowbutton" type="button" value="Delete selected" />');
                        container.append('<input style="margin-left: 5px;" id="updaterowbutton" type="button" value="Update selected" />');

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
                                alldata[row.condid] = { condid: row.condid, name: row.condname, slots: []};;
                            }
                            for (i = 0; i< subgridsId.length; i++){
                                var subrows = $('#'+ subgridsId[i]).jqxGrid('getrows');
                                if (!subrows[0])
                                    return;
                                //add to alldata
                                if (alldata[subrows[0].condid]){
                                    alldata[subrows[0].condid]["slots"] = subrows;
                                }
                            }
                            var rulename = $("#rule-"+gridId).val();

                            //send to server
                            registerRuleOnServer({name: rulename, conditions: alldata}, function(facts){
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

                        var logButton = $("<div style='float: left; margin-left: 5px;'>" +
                            "<img style='position: relative; margin-top: 2px;' src='/images/see.png'/>" +
                            "<span style='margin-left: 4px; position: relative; top: -3px;'>Facts</span></div>");
                        container.append(logButton);
                        logButton.jqxButton({  width: 60, height: 20 });

                        logButton.click(function (event) {
                            logFactsOnServer("all");
                        });

                    }
                });

        }

        //---------- socket.io interactions ------------
        function registerRuleOnServer(data){
            if (serverSocket){
                serverSocket.registerRule(data,
                    function(){},
                    null,
                    function(status, msg){
                    console.log("Register rule msg from server: " + msg);
                });
            }

        }
        function resetNetworkOnServer(){
            if (serverSocket){
                serverSocket.resetNetwork(function(boolres){
                    //do sthng?
                });
            }
        }
        function logFactsOnServer(){
            if (serverSocket){
                serverSocket.getServerFacts(null, function(res){
                    initFactsGrid(res, "factsGrid");
                });
            }
        }


        function initSocket(s, login) {
            //setup the socket
            serverSocket = s;
            //set the login name on the server for this client
            setLoginName(login);

        }

        function initVisualizeRules(btnId, outputId, lib, libDagre){

            d3 = lib;   //set d3
            dagre = libDagre;

            var theButton = $("#"+btnId).jqxButton({ width: '200', height: '30'});
            theButton.click(function(e){

                serverSocket.getRete(function(result){
                    drawReteGraph2(result, outputId)
                });

            });
        }



        function drawReteGraph2(data, output){
            var nodes = [];
            var edges = [];

            var i, queue = [], currentNode = data, processedNodes = {}, processedEdges = {};
            //add root
            nodes.push({ id: currentNode.id, value: {label: "Root", style: "fill: #C0C0C0" } });
            //loop while adding other nodes and edges
            while (currentNode){
                var children = currentNode.children;
                if (children){
                    for (i = 0; i < children.length; i++){
                        var child = children[i];

                        //add edge
                        //add edge
                        var edgeid =  currentNode.id + "-" + child.id;
                        if (!processedEdges[edgeid]){
                            edges.push({id:edgeid, u: currentNode.id, v: child.id });
                            processedEdges[edgeid] = edgeid;
                        }

                        if (processedNodes[child.id]){
                            continue;
                        }
                        //add to avoid duplicates
                        processedNodes[child.id] = child;
                        queue.push(child);

                        //add node
                        nodes.push({id: child.id, value: { label: child.type + " " + (child.text || ""),
                                    style: "fill: "+ NODE_COLORS[child.type], test: child.text,
                                    owner: child.owner, scope: child.scope } });
                    }
                }
                currentNode = queue.shift();
            }

            //now that we have all nodes, render
            var myg = dagre.json.decode(nodes, edges);

            var renderer = new dagre.Renderer();
            var oldDrawNodes = renderer.drawNodes();
            var svgNodes;
            renderer.drawNodes(function(graph, root) {
                svgNodes = oldDrawNodes(graph, root);
                //svgNodes.attr("id", function(u) { return "node-" + u; });
                svgNodes.select("rect").attr("style", function(u) {
                    var nodeInfo = myg.node(u);
                    var thisRect = d3.select(this);
                    //add the attributes
                    thisRect.attr("rete_node", nodeInfo.label);
                    thisRect.attr("rete_text", nodeInfo.test);
                    thisRect.attr("rete_nodeid", u);
                    //add tooltip
                    $(d3.select(this)).jqxTooltip({ content: '<b>Node:</b> <i>'+ nodeInfo.label
                                           +'</i><br />'
                                            +'<p>owner: '+
                                            (nodeInfo.owner || '?' )
                                            + '<br />scope: '+
                                             (nodeInfo.scope || '?' )
                                            +'</p>',
                                            position: 'mouse', name: 'NodeTooltip'});

                    return nodeInfo.style || u;
                });
                   // .on("mouseover", mouseOver)
                   // .on("mouseout", mouseOut);
                return svgNodes;
            });

            var layout = renderer.run(myg, d3.select("svg g"));

            d3.select("svg")
                .attr("width", layout.graph().width + 40)
                .attr("height", layout.graph().height + 40);
        }

        function initFactsGrid(facts, factsGrid){
            var slots = [];
            //facts
            if (facts) {
                facts.forEach(function(fact){
                    fact.slots.forEach(function(slot){
                        //slot.id = fact.id;
                        slot.facttype = fact.type;
                        slot.factscope = fact.scope;
                        slot.factowner = fact.owner;
                        slot.id = fact.id;
                        slot.slotid = ""+Math.random();
                        slots.push(slot);
                    });
                });
            }
            var source = {
                dataType: "array",
                pagesize: 30,
                localData: slots
            };
            var dataAdapter = new $.jqx.dataAdapter(source);

            // create Tree Grid
            $("#"+factsGrid).jqxGrid(
                {
                    width: 820,
                    source: dataAdapter,
                    groupable: true,
                    //pageable: true,
                    height: 330,
                    columns: [
                        { text: 'Type', dataField: 'facttype', width: 200 },
                        { text: 'scope', dataField: 'factscope', width: 200 },
                        { text: 'owner', dataField: 'factowner', width: 200 },
                        { text: 'slot', dataField: 'type', width: 160, groupable: true },
                        { text: 'value', dataField: 'value' }
                    ],
                    groups: ['facttype', 'type']
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

        function setLoginName(name){
            $("#login").text(" Welcome, " + name);
        }

        return {
            init: function init(ruleContainer, socket, login){
                initGrid(ruleContainer);
                initSocket(socket, login);
            },
            initViz: function(btn, visualContainer, d3, dagred3){
                initVisualizeRules(btn, visualContainer, d3, dagred3);
            },

            param: function (param){
                return parseUrlParams(param);
            }
        };

    })();

