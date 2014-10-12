
function distanceBetween(lat1, lon1, lat2, lon2){

    //from http://www.movable-type.co.uk/scripts/latlong.html

    var R = 6371; // earth's radius km
    var l1 = lat1.toRadians();
    var l2 = lat2.toRadians();
    var lats = (lat2-lat1).toRadians();
    var lons = (lon2-lon1).toRadians();

    var a = Math.sin(lats/2) * Math.sin(lats/2) +
            Math.cos(l1) * Math.cos(l2) *
            Math.sin(lons/2) * Math.sin(lons/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    var d = R * c;

    return d;
}

/** Converts numeric degrees to radians */
if (typeof(Number.prototype.toRadians) === "undefined") {
    Number.prototype.toRadians = function() {
        return this * Math.PI / 180;
    }
}


exports.distanceBetween = distanceBetween;