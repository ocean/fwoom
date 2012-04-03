/* app.js */

console.log('app.js script loaded and started.');

var FuelWatchMobile = FuelWatchMobile === undefined ? {} : FuelWatchMobile;

// Quick and dirty function to print debug info to the page.
FuelWatchMobile.debugText = function(text) {
	var textChunk = '<code>' + text + '</code><br />';
	$('#home').append(textChunk);
};

FuelWatchMobile.locationSuccess = function(position) {
	var lat = position.coords.latitude;
	var lng = position.coords.longitude;
	var acc = position.coords.accuracy;
	/* watchPosition doesn't work as we want fast results :-/
	if (acc < 200) {
		navigator.geolocation.clearWatch(watchID);
		FuelWatchMobile.geoCode(lat,lng);
	} */
	console.log('Geo results: ' + lat + ', ' + lng + ', ' + acc);
	FuelWatchMobile.debugText('Geo results: ' + lat + ', ' + lng + ', ' + acc);
	FuelWatchMobile.geoCode(lat,lng,acc);
};

FuelWatchMobile.geoCode = function(lat,lng) {
	var geocoder = new google.maps.Geocoder();
	var latlng = new google.maps.LatLng(lat, lng);
	geocoder.geocode({'latLng': latlng}, function(results, status) {
		if (status === google.maps.GeocoderStatus.OK) {
			if (results[0]) {
				$.each(results[0].address_components, function(i,v) {
					if (results[0].address_components[i].types[0].match(/locality/)) {
						var sub = results[0].address_components[i].long_name.toString();
						console.log('Detected suburb: ' + sub);
						$('#suburb').val(sub);
						$('#searchForm').submit();
						$('#home').toggleClass('current');
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

FuelWatchMobile.toRad = function(x) { return x * Math.PI / 180; };

// Distance in kilometers between two points using the Haversine algo.
FuelWatchMobile.haversine = function(lat1, lon1, lat2, lon2) {
	var toRad = FuelWatchMobile.toRad();
  var R = 6371;
  var dLat  = this.toRad(lat2 - lat1);
  var dLong = this.toRad(lon2 - lon1);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLong/2) * Math.sin(dLong/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;

  return Math.round(d);
 };

FuelWatchMobile.haversine_optim = function(lat1, lon1, lat2, lon2) {
	var R2 = 6371009 * 2;
	var toRad = FuelWatchMobile.toRad();
	var aLat = toRad(lat1);
	var bLat = toRad(lat2);
	var dLat2 = (bLat - aLat) * 0.5;
	var dLon2 = toRad(lon2 - lon1) * 0.5;
	var sindLat = Math.sin(dLat2);
	var sindLon = Math.sin(dLon2);
	var x = sindLat * sindLat + Math.cos(aLat) * Math.cos(bLat) * sindLon * sindLon;
	return R2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

/*
var geocoder;
var map;
var infowindow = new google.maps.InfoWindow();
var marker;
function initialize() {
	geocoder = new google.maps.Geocoder();
	var latlng = new google.maps.LatLng(40.730885,-73.997383);
	var myOptions = {
		zoom: 8,
		center: latlng,
		mapTypeId: 'roadmap'
	};
	map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
}

FuelWatchMobile.mapSomething = function() {
	var input = document.getElementById("latlng").value;
	var latlngStr = input.split(",",2);
	var lat = parseFloat(latlngStr[0]);
	var lng = parseFloat(latlngStr[1]);
	var latlng = new google.maps.LatLng(lat, lng);
	geocoder.geocode({'latLng': latlng}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			if (results[1]) {
				map.setZoom(11);
				marker = new google.maps.Marker({
						position: latlng,
						map: map
				});
				infowindow.setContent(results[1].formatted_address);
				infowindow.open(map, marker);
			} else {
				alert("No results found");
			}
		} else {
			alert("Geocoder failed due to: " + status);
		}
	});
}
*/

FuelWatchMobile.locationFail = function(error) {
	console.log('Location service not working.');
	FuelWatchMobile.debugText('Location service failed.');
	switch(error.code) {
		case error.TIMEOUT:
			console.log('Connection timeout');
			break;
		case error.POSITION_UNAVAILABLE:
			console.log('Position unavailable');
			break;
		case error.PERMISSION_DENIED:
			console.log('Permission denied');
			break;
		case error.UNKNOWN_ERROR:
			console.log('Unknown error');
			break;
	}
};

FuelWatchMobile.getXMLData = function(suburbEsc,fuelTypeEsc,ftText) {
	var fwURL = 'http%3A%2F%2Fwww.fuelwatch.wa.gov.au%2Ffuelwatch%2FfuelWatchRSS%3FSuburb%3D' + suburbEsc + fuelTypeEsc;
	console.log("FW-URL: " + fwURL);
	FuelWatchMobile.createResultsView();
	$.get("http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20xml%20where%20url%3D'" + fwURL + "'",
		function(data) {
			// Local Storage setup variables
			var searchDesc = $(data).find('channel').find('description').first().text();
			console.log('SearchDesc: ' + searchDesc);
			var sds = searchDesc.split(' ')[0];
			var sd = sds.split('/');
			var sDate = Date.parse(sd[2]+'-'+sd[1]+'-'+sd[0]);
			console.log('Date: ' + sDate.toString());
			// Array to collect results objects
			var resultsArray = [];
			$(data).find('item').each(function() {
				var tradingName = $(this).find('trading-name').text();
				var tNameCompressed = tradingName.toLowerCase().replace(/ /g, '-').replace(/\'/g, '-');
				var address = $(this).find('address').text();
				var location = $(this).find('location').text();
				var price = $(this).find('price').text();
				var latitude = $(this).find('latitude').text();
				var longitude = $(this).find('longitude').text();
				var phoneNumber = $(this).find('phone').text();
				var resultsObject = {
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
			FuelWatchMobile.buildResultsList(resultsArray);
		},"xml"
	);
	// Event listener for back button, goes back to top section and removes current results section
	$('a.back').click(function(e) {
		e.preventDefault();
		if ($('section#search').hasClass('current')) {
			$('section#results').toggleClass('current');
			setTimeout(function() { $('#results').remove(); }, 300);
		} else {
			$('section#results').toggleClass('current');
			$('#home').toggleClass('current');
			setTimeout(function() { $('#results').remove(); }, 300);
		}
	});
};

FuelWatchMobile.createResultsView = function() {
	var resultListSection = '<section id="results"><div class="top-menu"><h1>Results</h1><div class="back-button"><a href="#" title="Back" class="back button">Back</a></div></div><ul class="resultList"></ul></section>';
	$('section#search').after(resultListSection);
	setTimeout(function() { $('#results').toggleClass('current'); }, 100);
};

FuelWatchMobile.buildResultsList = function(resultsArray) {
	// Holder for HTML of results list.
	var resultListHTMLString = '';
	$.each(resultsArray,function(i,o){
		var resultItem = '<li><a href="#/' + o.tradingnamecompressed + '" data-tradingname="' + o.tradingname + '" data-address="' + o.address + '" data-suburb="' + o.suburb + '" data-price="' + o.price + '" data-latitude="' + o.latitude + '" data-longitude="' + o.longitude + '" data-phone="' + o.phone + '"><span class="information"><h1>' + o.tradingname + '</h1><p>' + o.address + '<br />' + o.suburb + '</p></span><span class="price"><h1>' + o.price + '</h1></span></a></li>';
		resultListHTMLString += resultItem;
	});
	$('ul.resultList').append(resultListHTMLString);
	$('ul.resultList').css('background', 'none');
	// Event listener for list items, goes to details view
	$('ul.resultList li a').click(function(){
		console.log('Details list clicked.');
		var stationDetails = $(this).data();
		// console.dir(stationDetails);
		FuelWatchMobile.detailsView(stationDetails);
		return false;
	});
};

FuelWatchMobile.detailsView = function(details) {
	var staticMapURL = "http://maps.googleapis.com/maps/api/staticmap?";
	var staticMapParams = "zoom=17&size=500x250&scale=2&sensor=true&markers=color:red%7Csize:normal%7C";
	var staticMapMarker = details.latitude + "," + details.longitude;
	var mapImgSrc = staticMapURL + staticMapParams + staticMapMarker;
	var mapLink = "http://maps.google.com.au/maps?q=" + staticMapMarker;
	var detailsViewSection = '<section id="detailsView"><div class="top-menu"><h1>Details</h1><div class="back-button"><a href="#" title="Back" class="button detailsBack">Back</a></div></div><div class="content-container"><div class="map-container"><a href="'+ mapLink + '" title="Link to map of ' + details.tradingname + '"><img src="' + mapImgSrc + '" alt="Map of ' + details.tradingname + '"/></a></div><div class="price-distance-container"><span class="price"><h2>' + details.price + '</h2></span><span class="distance"><h2>' + details.price + '</h2></span></div><address><h3>' + details.tradingname + '</h3>' + details.address + ', ' + details.suburb + '<br />' + details.phone + '</address><div class="directions"><a href="' + mapLink + '" title="Link to map of ' + details.tradingname + '">Get directions</a></div></section>';
	$('section#results').after(detailsViewSection);
	setTimeout(function() { $('#detailsView').toggleClass('current'); }, 100);
	$('a.detailsBack').click(function(e) {
		e.preventDefault();
		$('section#detailsView').toggleClass('current');
		setTimeout(function() { $('#detailsView').remove(); }, 300);
	});
};

FuelWatchMobile.mapView = function() {
	// body...
};


$(document).ready(function(){

	$('#searchForm').submit(function(){
		console.log('Search form submitted.');
		var suburb = $('#suburb').val() ? $('#suburb').val() : 'Subiaco';
		var suburbEsc = encodeURIComponent(suburb).replace(/ /g, '%20').replace(/\'/g, '%27').replace(/\%/g, '%25');
		var fuelType = $('#fueltype').val() ? $('#fueltype').val() : 1;
		var ftText = (fuelType > 1) ? $('#fueltype option:selected').text() : 'ULP';
		console.log('Fuel Type: ' + fuelType + ' - ' + ftText);
		var fuelTypeEsc = encodeURIComponent('&Product=' + fuelType);
		FuelWatchMobile.getXMLData(suburbEsc,fuelTypeEsc,ftText);
		$('#suburb').blur();
		return false;
	});

	$('#findMeNow').click(function(){
		console.log('Find Me button clicked.');
		// FuelWatchMobile.debugText('Find Me button clicked');
		if (navigator.geolocation) {
			// Safari waits a long time to get an accurate position, often failing if timeout is too low :-/
			// navigator.geolocation.getCurrentPosition(FuelWatchMobile.locationSuccess, FuelWatchMobile.locationFail, { timeout: 30000, maximumAge: 0 });
			// watchPosition can't really be used as we need a quick position fix :-/
			// navigator.geolocation.watchPosition(FuelWatchMobile.locationSuccess, FuelWatchMobile.locationFail);
			navigator.geolocation.getCurrentPosition(FuelWatchMobile.locationSuccess, FuelWatchMobile.locationFail);
		} else {
			console.log('Location not supported in this browser.');
		}
		return false;
	});

	$('#advSearch').click(function(){
		$('#home').toggleClass('current');
		$('section#search').toggleClass('current');
		return false;
	});

	$('a.home').click(function(){
		$('#home').toggleClass('current');
		$('section#search').toggleClass('current');
		return false;
	});

});

window.addEventListener("load",function() {
	setTimeout(function(){
		window.scrollTo(0, 1);
	}, 0);
});