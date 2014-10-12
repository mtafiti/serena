/**
 * Created by ken on 01/09/14.
 */
//expects date in the format yyyy-mm-dd.
//modified from http://stackoverflow.com/questions/4060004/calculate-age-in-javascript
function ageFromDate(date){
        var today = new Date();
        var birthDate = new Date(date.substr(0, 4), date.substr(5, 2)-1, date.substr(8, 2));
        var age = today.getFullYear() - birthDate.getFullYear();
        var m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
}

exports.ageFromDate = ageFromDate;