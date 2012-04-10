var FuelWatchMobile;

console.log("app.js script loaded and started.");

FuelWatchMobile = FuelWatchMobile === undefined ? {} : FuelWatchMobile;

FuelWatchMobile.locationSuccess = function(position) {
    var lat = position.coords.latitude, lng = position.coords.longitude, acc = position.coords.accuracy;
    console.log("Geo results: " + lat + ", " + lng + ", " + acc);
    FuelWatchMobile.debugText("Geo results: " + lat + ", " + lng + ", " + acc);
    FuelWatchMobile.geoCode(lat, lng, acc);
};

FuelWatchMobile.geoCode = function(lat, lng) {
    var geocoder = new google.maps.Geocoder, latlng = new google.maps.LatLng(lat, lng);
    geocoder.geocode({
        latLng: latlng
    }, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            if (results[0]) {
                $.each(results[0].address_components, function(i) {
                    var sub;
                    if (results[0].address_components[i].types[0].match(/locality/)) {
                        sub = results[0].address_components[i].long_name.toString();
                        console.log("Detected suburb: " + sub);
                        $("#suburb").val(sub);
                        $("#searchForm").submit();
                        $("#home").toggleClass("current");
                    }
                });
            } else {
                console.log("No results found");
            }
        } else {
            console.log("Geocoder failed due to: " + status);
        }
    });
};

FuelWatchMobile.toRad = function(x) {
    return x * Math.PI / 180;
};

FuelWatchMobile.haversine = function(lat1, lon1, lat2, lon2) {
    var toRad = FuelWatchMobile.toRad(), R = 6371, dLat = this.toRad(lat2 - lat1), dLong = this.toRad(lon2 - lon1), a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLong / 2) * Math.sin(dLong / 2), c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), d = R * c;
    return Math.round(d);
};

FuelWatchMobile.haversine_optim = function(lat1, lon1, lat2, lon2) {
    var R2 = 6371009 * 2, toRad = FuelWatchMobile.toRad(), aLat = toRad(lat1), bLat = toRad(lat2), dLat2 = (bLat - aLat) * .5, dLon2 = toRad(lon2 - lon1) * .5, sindLat = Math.sin(dLat2), sindLon = Math.sin(dLon2), x = sindLat * sindLat + Math.cos(aLat) * Math.cos(bLat) * sindLon * sindLon;
    return R2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

FuelWatchMobile.locationFail = function(error) {
    console.log("Location service not working.");
    FuelWatchMobile.debugText("Location service failed.");
    switch (error.code) {
      case error.TIMEOUT:
        console.log("Connection timeout");
        break;
      case error.POSITION_UNAVAILABLE:
        console.log("Position unavailable");
        break;
      case error.PERMISSION_DENIED:
        console.log("Permission denied");
        break;
      case error.UNKNOWN_ERROR:
        console.log("Unknown error");
        break;
    }
};

FuelWatchMobile.getXMLData = function(suburbEsc, fuelTypeEsc, ftText, callback) {
    var resultsArray, fwURL = "http%3A%2F%2Fwww.fuelwatch.wa.gov.au%2Ffuelwatch%2FfuelWatchRSS%3FSuburb%3D" + suburbEsc + fuelTypeEsc;
    console.log("FW-URL: " + fwURL);
    resultsArray = [];
    $.get("http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20xml%20where%20url%3D'" + fwURL + "'", function(data) {
        var sds, sd, sDate, searchDesc = $(data).find("channel").find("description").first().text();
        console.log("SearchDesc: " + searchDesc);
        sds = searchDesc.split(" ")[0];
        sd = sds.split("/");
        sDate = Date.parse(sd[2] + "-" + sd[1] + "-" + sd[0]);
        console.log("Date: " + sDate.toString());
        $(data).find("item").each(function() {
            var tradingName = $(this).find("trading-name").text(), tNameCompressed = tradingName.toLowerCase().replace(/ /g, "-").replace(/\'/g, "-"), address = $(this).find("address").text(), location = $(this).find("location").text(), price = $(this).find("price").text(), latitude = $(this).find("latitude").text(), longitude = $(this).find("longitude").text(), phoneNumber = $(this).find("phone").text(), resultsObject = {
                tradingnamecompressed: tNameCompressed,
                tradingname: tradingName,
                address: address,
                suburb: location,
                price: price,
                latitude: latitude,
                longitude: longitude,
                phone: phoneNumber
            };
            resultsArray.push(resultsObject);
        });
        callback(resultsArray);
    }, "xml");
};

FuelWatchMobile.setContainerHeight = function() {
    var h = $(window).height() + "px";
    $(".container").css("height", h);
};

FuelWatchMobile.createResultsView = function() {
    var resultListSection = '<section id="results"><header><h1>Results</h1><div class="back-button"><a href="#" title="Back" class="back button">Back</a></div><div class="fuel-selector"><select id="fueltype" name="fueltype"><option value="1">ULP</option><option value="2">PULP</option><option value="4">Diesel</option><option value="5">LPG</option><option value="6">98RON</option><option value="7">B20</option></select></header><div class="container"><div class="content-wrapper"><ul class="resultList"></ul></div></div></section>';
    $("section#search").after(resultListSection);
    FuelWatchMobile.setContainerHeight();
    setTimeout(function() {
        $("#results").toggleClass("current");
    }, 200);
    $("a.back").click(function(e) {
        e.preventDefault();
        if ($("section#search").hasClass("current")) {
            $("section#results").toggleClass("current");
            setTimeout(function() {
                $("#results").remove();
            }, 300);
        } else {
            $("section#results").toggleClass("current");
            $("#home").toggleClass("current");
            setTimeout(function() {
                $("#results").remove();
            }, 300);
        }
    });
};

FuelWatchMobile.buildResultsList = function(resultsArray) {
    var resultListHTMLString = "";
    $.each(resultsArray, function(i, o) {
        var resultItem = '<li><a href="#/' + o.tradingnamecompressed + '" data-tradingname="' + o.tradingname + '" data-address="' + o.address + '" data-suburb="' + o.suburb + '" data-price="' + o.price + '" data-latitude="' + o.latitude + '" data-longitude="' + o.longitude + '" data-phone="' + o.phone + '"><span class="primary"><h3>' + o.tradingname + "</h3><h4>" + o.address + ", " + o.suburb + '</h4></span><span class="secondary"><div class="button price">' + o.price + '<small> &#162;/l</small></div><div class="button distance">' + "2.4" + "<small>km</small>" + '</div><div class="button type">' + "ULP" + "</div></a></li>";
        resultListHTMLString += resultItem;
    });
    $("ul.resultList").append(resultListHTMLString);
    $("ul.resultList").css("background", "none");
    $("ul.resultList li a").click(function() {
        var stationDetails;
        console.log("Details list clicked.");
        stationDetails = $(this).data();
        FuelWatchMobile.detailsView(stationDetails);
        return false;
    });
};

FuelWatchMobile.detailsView = function(details) {
    var staticMapURL = "http://maps.googleapis.com/maps/api/staticmap?", staticMapParams = "zoom=17&size=500x250&scale=2&sensor=true&markers=icon:http://www.commerce.wa.gov.au/fwoom/images/fillingstationdefault.png%7C", staticMapMarker = details.latitude + "," + details.longitude, mapImgSrc = staticMapURL + staticMapParams + staticMapMarker, mapLink = "http://maps.google.com.au/maps?q=" + staticMapMarker, detailsViewSection = '<section id="detailsView"><header><h1>Details</h1><div class="back-button"><a href="#" title="Back" class="button detailsBack">Back</a></div></header><div class="container"><div class="content-wrapper"><div class="map-container"><a href="' + mapLink + '" title="Link to map of ' + details.tradingname + '"><img src="' + mapImgSrc + '" alt="Map of ' + details.tradingname + '"/></a></div><div class="price-distance-container"><span class="price"><h2>' + details.price + '</h2></span><span class="distance"><h2>' + details.price + "</h2></span></div><address><h3>" + details.tradingname + "</h3>" + details.address + ", " + details.suburb + "<br />" + details.phone + '</address><div class="directions"><a href="' + mapLink + '" title="Link to map of ' + details.tradingname + '">Get directions</a></div></div></section>';
    $("section#results").after(detailsViewSection);
    FuelWatchMobile.setContainerHeight();
    setTimeout(function() {
        $("#detailsView").toggleClass("current");
    }, 200);
    $("a.detailsBack").click(function(e) {
        e.preventDefault();
        $("section#detailsView").toggleClass("current");
        setTimeout(function() {
            $("#detailsView").remove();
        }, 300);
    });
};

FuelWatchMobile.createMapView = function() {
    var mapSection = '<section id="map"><header><h1>Map</h1><div class="back-button"><a href="#" title="Back" class="back button">Back</a></div></header><div class="container">Map goes here.</div></section>';
    $("section#search").after(mapSection);
    FuelWatchMobile.setContainerHeight();
    setTimeout(function() {
        $("#map").toggleClass("current");
    }, 200);
    $("a.back").click(function(e) {
        e.preventDefault();
        $("section#map").toggleClass("current");
        $("#home").toggleClass("current");
        setTimeout(function() {
            $("#map").remove();
        }, 300);
    });
};

FuelWatchMobile.buildMap = function() {};

FuelWatchMobile.getLocation = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(FuelWatchMobile.locationSuccess, FuelWatchMobile.locationFail);
    } else {
        console.log("Location not supported in this browser.");
    }
};

function MapBg(position) {
    var lat = position.coords.latitude, long = position.coords.longitude, center = "-" + Math.abs(lat - 4e-4) + ",%20" + Math.abs(long + .0028), mapCode = '<img src="http://maps.googleapis.com/maps/api/staticmap?center=' + center + '&zoom=16&size=320x480&scale=2&sensor=false"/>';
    console.log(center);
    setTimeout(function() {
        $(mapCode).hide().appendTo("section#map");
    }, 500);
    setTimeout(function() {
        $("section#map img").fadeIn();
    }, 1e3);
}

$(document).ready(function() {
    navigator.geolocation.getCurrentPosition(MapBg);
    $("#searchForm").submit(function() {
        var suburb, suburbEsc, fuelType, ftText, fuelTypeEsc, resultsType;
        console.log("Search form submitted.");
        suburb = $("#suburb").val() ? $("#suburb").val() : "Subiaco";
        suburbEsc = encodeURIComponent(suburb).replace(/ /g, "%20").replace(/\'/g, "%27").replace(/\%/g, "%25");
        fuelType = $("#fueltype").val() ? $("#fueltype").val() : 1;
        ftText = fuelType > 1 ? $("#fueltype option:selected").text() : "ULP";
        console.log("Fuel Type: " + fuelType + " - " + ftText);
        fuelTypeEsc = encodeURIComponent("&Product=" + fuelType);
        $("#suburb").blur();
        resultsType = $("#resultsType").val();
        if (resultsType === "list") {
            FuelWatchMobile.createResultsView();
            FuelWatchMobile.getXMLData(suburbEsc, fuelTypeEsc, ftText, FuelWatchMobile.buildResultsList);
        } else {
            FuelWatchMobile.createMapView();
            FuelWatchMobile.getXMLData(suburbEsc, fuelTypeEsc, ftText, FuelWatchMobile.buildMap);
        }
        return false;
    });
    $("#findMeNow").click(function() {
        console.log("Find Me button clicked.");
        $("input#resultsType").val("list");
        FuelWatchMobile.getLocation();
        return false;
    });
    $("#mapNearby").click(function() {
        console.log("Map Nearby button clicked.");
        $("input#resultsType").val("map");
        FuelWatchMobile.getLocation();
        return false;
    });
    $("#advSearch").click(function() {
        $("#home").toggleClass("current");
        $("section#search").toggleClass("current");
        return false;
    });
    $("a.home").click(function() {
        $("#home").toggleClass("current");
        $("section#search").toggleClass("current");
        return false;
    });
});

window.addEventListener("load", function() {
    setTimeout(function() {
        window.scrollTo(0, 1);
    }, 0);
});