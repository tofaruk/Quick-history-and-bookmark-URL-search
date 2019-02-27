//https://chromium.googlesource.com/chromium/src/+/master/chrome/common/extensions/docs/examples/api/history/historyOverride

var kMillisecondsPerDay = 1000 * 60 * 60 * 24;
var kMillisecondsPerWeek = kMillisecondsPerDay * 7;
var kOneWeekAgo = (new Date).getTime() - kMillisecondsPerWeek;

document.addEventListener("DOMContentLoaded", function (event) {
    searchHistory('', ((new Date).getTime() - kMillisecondsPerDay), (new Date).getTime(), 50);

    setTimeout(function () {
        buildNavigationOptions();
    }, 1000);

});


var searchHistory = function (searchTerm, startTime, endTime, limit) {
    var loading = $("#loading");
    loading.show();
    console.log({
        searchTerm: searchTerm,
        startTime: getVisitTimeTemp(startTime),
        endTime: getVisitTimeTemp(endTime),
        limit: limit
    });
    // alert(searchTerm);
    chrome.history.search({
        text: searchTerm,
        startTime: startTime,
        endTime: endTime,
        maxResults: limit
    }, constructHistory);

}

var constructHistory = function (historyItems) {
    var historyTable = $("#historyTable");
    var loading = $("#loading");
    var noData = $("#noData");
    $("#historyTable .item").remove();
    console.log(historyItems);
    if(historyItems.length > 0){
        noData.hide();
    }else{
        noData.show();
    }
    historyItems.forEach(function (item) {
        var tr = document.createElement("tr");
        tr.setAttribute('class', 'item');
        var td = document.createElement("td");
        var p_info = document.createElement("p");
        p_info.setAttribute('class', 'item_info');
        var p_info_title = document.createElement("span");
        var p_time = document.createElement("p");
        p_time.setAttribute('class', 'time');
        var p_url = document.createElement("p");
        p_url.setAttribute('class', 'item_url');
        var url_a = document.createElement("a");
        url_a.setAttribute('target', '_blank');
        var favicon = document.createElement('img');
        favicon.src = 'chrome://favicon/' + item.url;
        p_info.appendChild(favicon);
        p_info_title.innerText = item.title ? item.title : item.url;
        p_info.appendChild(p_info_title);
        url_a.href = item.url;
        url_a.innerText = item.url;
        p_url.append(url_a);
        var p_time_span = document.createElement('span');
        p_time_span.innerText = getVisitTime(item);
        p_time.append(p_time_span);
        td.append(p_info);
        td.append(p_time);
        td.append(p_url);
        tr.append(td);
        historyTable.append(tr);
    });
    loading.hide();

}

var buildNavigationOptions = function () {
    chrome.history.search({
        text: '',
        startTime: kOneWeekAgo,
        maxResults: 1000
    }, constructNavigationOptions);
}
var constructNavigationOptions = function (historyItems) {
    var searchForm = $("#searchForm");
    var websiteSelect = $("#website");
    var hostnames = [];
    var months = [];
    historyItems.forEach(function (item) {
        hostnames.push(((new URL(item.url)).hostname));
        months.push(item);
    });

    var unique = hostnames.filter(onlyUnique);
    unique.forEach(function (item) {
        websiteSelect.append('<option value="' + item + '">' + item + '</option>')
    });


}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

var getVisitTime = function (item) {
    var options = {weekday: 'short', day: '2-digit', month: 'long', hour: '2-digit', minute: 'numeric'};
    var time = new Date(item.lastVisitTime);

    return time.toLocaleTimeString("en-US", options);

}

var getVisitTimeTemp = function (time) {
    var options = {weekday: 'short', day: '2-digit', month: 'long', hour: '2-digit', minute: 'numeric'};
    var time = new Date(time);

    return time.toLocaleDateString("en-US", options) + '/ ' + time.toLocaleTimeString("en-US", options);

}
function getStartAndEndTimeFromFilterOption() {
    var timeFilterSelect = $("#time_filter");

    var timeFilterArray = timeFilterSelect.val().split('-');
    var endTime = (new Date).getTime();
    var startTime = (new Date).getTime() - (kMillisecondsPerDay);
    if (timeFilterArray[0] != '0' && timeFilterArray[1] == 'd') {
        endTime = (new Date).getTime() - (kMillisecondsPerDay * parseInt(timeFilterArray[0]));
        startTime = (new Date).getTime() - (kMillisecondsPerDay * (parseInt(timeFilterArray[0]) + 1));

    }
    if (timeFilterArray[0] != '0' && timeFilterArray[1] == 'w') {
        endTime = (new Date).getTime() - (kMillisecondsPerWeek * parseInt(timeFilterArray[0]));
        startTime = (new Date).getTime() - (kMillisecondsPerWeek * (parseInt(timeFilterArray[0]) + 1));

    }
    return {endTime: endTime, startTime: startTime};
}

$(document).ready(function (e) {
    $("#searchForm").on("submit", function (event) {
        event.preventDefault()
    })

    $("#searchForm").change(function (event) {
        var searchTermInput = $("#searchTerm");
        var websiteSelect = $("#website");
        var limitSelect = $("#limit");

        var startAndEndTime = getStartAndEndTimeFromFilterOption();

        var text = String(searchTermInput.val() + ' ' + websiteSelect.val());
        searchHistory($.trim(text), startAndEndTime.startTime, startAndEndTime.endTime, parseInt(limitSelect.val()));

        event.preventDefault();
        return false;
    });
});


/**
 chrome.bookmarks.getTree(function(data){
console.log(data);
});

 chrome.bookmarks.search('tutorial', function(data){
console.log(data);
});
 */