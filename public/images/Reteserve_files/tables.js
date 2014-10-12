var tables = (function(){
// prepare the data
    function initTables(){
var data = [
    {tableno: 1, name: "Table 1", img: "/images/table.jpg", capacity: 2, location: "Window" ,status: "Free" },
    {tableno: 2, name: "Table 2", img: "/images/table.jpg", capacity: 2, location: "Door", status: "Free" },
    {tableno: 3, name: "Table 3", img: "/images/table.jpg", capacity: 2, location: "Middle", status: "Free" },
    {tableno: 4, name: "Table 4", img: "/images/table.jpg", capacity: 2, location: "Window", status: "Free" },
    {tableno: 5, name: "Table 5", img: "/images/table.jpg", capacity: 2, location: "Private", status: "Free" },
    {tableno: 6, name: "Table 6", img: "/images/table.jpg", capacity: 2, location: "Private", status: "Free" },
    {tableno: 7, name: "Table 7", img: "/images/table.jpg", capacity: 2, location: "Middle", status: "Free" }
];
var source =
{
    localData: data,
    dataType: "array"
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
        rendered: function () {
            //$(".buy").jqxButton();
            //$(".buy").click(function () {
            //    itemsInCart++;
            //    $(".cart-top p").html(itemsInCart + " products");
            //});
        },
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
                    var middlecolumn = '<div style="float: left; width: 40%;">';
                    var rightcolumn = '<div style="float: left; width: 40%;">';

                    leftcolumn += image + "</div>";

                    var tablename = "<div style='margin: 10px;'><b>Table:</b> " + rowData.name + "</div>";
                    var tablecapacity = "<div style='margin: 10px;'><b>No of people:</b> " + rowData.capacity + "</div>";
                    var location = "<div style='margin: 10px;'><b>Location:</b> " + rowData.location + "</div>";

                    middlecolumn += tablename;
                    middlecolumn += tablecapacity;
                    middlecolumn += location;
                    middlecolumn += "</div>";

                    var postalcode = "<div style='margin: 10px;'>"+ tableStatusImage(rowData)+"</div>";
                    var reservebutton = "<div style='margin: 10px;'><b>Status:</b> " + rowData.status + "</div>";

                    rightcolumn += postalcode;
                    rightcolumn += reservebutton;

                    rightcolumn += "</div>";

                    container += leftcolumn;
                    container += middlecolumn;
                    container += rightcolumn;
                    container += "</div>";

                    return container;
                }
            }
        ]
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
    return {
        initTables: initTables
    };

})();

