/**
 * Created by ken on 01/09/14.
 */

var shoot =
    (function () {

        var sereneServer, clientName, clientGroup;


        function constructRule(name, lat, lng, distance, interested_gender, lowest_age){
            var rule =  {
                rulename: "rule-match-"+name,
                conditions: [
                    { type: "person", name: name , lat: "?lat1", lng: "?lng1", dob: "?dob1"},
                    { type: "person", name: "?n" , lat: "?lat2", lng: "?lng2", dob: "?dob2", gender: interested_gender, pic: "?pic"},
                    {type: "expr", expr: "distance("+lat+", "+lng+", ?lat2, ?lng2) < " + distance },
                    {type: "expr", expr: "age(?dob2) > " + lowest_age }
                ]
            };

            sereneServer.registerRule(rule,
                function(facts){
                    //rule fired
                },
                null,
                function(){
                    //rule saved successfully
                });
        }

        function saveMyDetails(name, lat, lng, gender, dob, picurl){
            var fact = {name: name, lat: lat, lng: lng, dob: dob, gender: gender, pic: picurl};
            sereneServer.assertFact(fact, function(msg){
               //saved successfully
            });
        }

        /* --------- utility methods ------------- */
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


        /* --------- serena client methods ------------ */

        function assertFactToServer(facts){
            if (sereneServer){
                sereneServer.assertFact(facts, function(res){

                });
            }
        }

        function onConnect(){

            sereneServer.onPublicRuleActivation(function(rulename, facts){
                //public rule called
                var str = $('#fired').html() +  "<p><b>Public rule "
                    + rulename
                    + " activated.</b>"
                    + JSON.stringify(facts) + "</p>";
                $('#fired').html(str);
            });


            if (sereneServer.clientGroup) {
                //group rules
                sereneServer.onGroupRuleActivation(function(rulename, facts){
                    var str = $('#fired').html() +  "<p><b>Group rule "
                        + rulename
                        + " activated.</b>"
                        + JSON.stringify(facts) + "</p>";
                    $('#fired').html(str);
                });
            }
        }


        // --------- inits ------------
        function storeSereneDetails(server, login, grp) {
            //setup the socket
            sereneServer = server;
            //set the login name on the server for this client, locally
            clientName = login;
            clientGroup = grp;
        }

    return {
        init: function init(socket, login, group){
            storeSereneDetails(socket, login ,group);
        },

       getParam: function (param){
            return parseUrlParams(param);
        },
        onConnect: onConnect
    };

    })();