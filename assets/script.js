//https://chromium.googlesource.com/chromium/src/+/master/chrome/common/extensions/docs/examples/api/history/historyOverride
const kMillisecondsPerDay = 1000 * 60 * 60 * 24;
const kMillisecondsPerWeek = kMillisecondsPerDay * 7;
const kOneWeekAgo = (new Date).getTime() - kMillisecondsPerWeek;

var bookmarks = [];
var folders = [];

document.addEventListener("DOMContentLoaded", function (event) {
    searchHistory('', ((new Date).getTime() - kMillisecondsPerDay), (new Date).getTime(), 50);

    setTimeout(function () {
        buildNavigationOptions();
        getBookTree();
    }, 1000);

});


var searchHistory = function (searchTerm, startTime, endTime, limit) {
    var loading = $("#loading");
    loading.show();
    console.log({searchTerm, startTime, endTime, limit});
    chrome.history.search({
        text: searchTerm,
        startTime: startTime,
        endTime: endTime,
        maxResults: limit
    }, constructHistory);

}

var constructHistory = function (historyItems) {
    var historyTable = $("#historyContainer .item_table");
    var trOriginal = $("#coreItemTable .core_history_item");

    var loading = $("#loading");

    var noData = $("#noData");
    $("#historyContainer .item_table .item").remove();

    if (historyItems.length > 0) {
        noData.hide();
    } else {
        noData.show();
    }
    console.log(historyItems.length);
    console.log(historyItems);
    historyItems.forEach(function (item) {

        var tr = trOriginal.clone();
        tr.addClass('item');
        tr.find("p.info_title a.title").text(item.title).attr('href', item.url);
        tr.find("p.info_title span.favicon").css('content', 'url("chrome://favicon/'+item.url+'")');
        tr.find("p.info_time span.time_info").text(getVisitTime(item));
        tr.find("p.info_url a.full_url").text(item.url).attr('href', item.url);
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
    var options = {weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: 'numeric'};
    var time = new Date(item.lastVisitTime);

    return time.toLocaleTimeString("en-US", options);

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


var traverse = function (item) {
    for (i in item) {
        if (!!item[i] && typeof(item[i]) == "object") {
            if (item[i].hasOwnProperty('url')) {
                bookmarks.push({parentId: item[i].parentId, title: item[i].title, url: item[i].url});
            } else {
                folders[item[i].id] = {id: item[i].id, title: item[i].title, path: folders[item[i].parentId]};
            }
            traverse(item[i]);
        }
    }
}

var getFolders = function (paths, arr) {

    if (paths.id != 0) {
        getFolders(paths.path, arr);
    }
    if (paths.id != 0) {
        arr.push(paths.title);
    }

    return arr;
}

var getBookTree = function () {
    if (bookmarks.length == 0) {
        chrome.bookmarks.getTree(function (data) {
            traverse(data);
        });
    }

}
var constructBookmarkTable = function () {

    var bookmarkTable = $("#bookmarkContainer .item_table");
    var trOriginal = $("#coreItemTable .core_bookmark_item");
    if (bookmarkTable.find(".item").length > 0) {
        return;
    }

    bookmarks.forEach(function (item) {
        var tr = trOriginal.clone();
        tr.addClass('item');
        tr.find("p.info_title a.title").text(item.title).attr('href', item.url);
        tr.find("p.info_title span.favicon").css('content', 'url("chrome://favicon/'+item.url+'")');
        var folderArr = getFolders(folders[item.parentId], []);
        tr.find("p.info_folder span.folder_container").html(folderArr.join('<span class="icon arrow"></span> '));
        tr.find("p.info_url a.full_url").text(item.url).attr('href', item.url);
        bookmarkTable.append(tr);
    });

    bookmarkTable.dataTable({
        "ordering": false,
        "info": false,
        "pageLength": 50,
        "lengthMenu": [ 10, 25, 50, 100, 500, 1000],
        "pagingType": "simple",
        "dom": '<"tools_wrapper"<"left_tools"f><"mid_tools"p><"right_tools"l>>',
        "language": {
            search: '',
            searchPlaceholder: 'Search your bookmark',
            zeroRecords: 'No bookmark found',
            lengthMenu: '_MENU_',

        },
        columnDefs: [ {
            orderable: false,
            className: 'select-checkbox',
            targets:   0
        } ],
        select: {
            style:    'os',
            selector: 'td:first-child'
        }
    });

}


$(document).ready(function (e) {
    $("#searchTerm").keyup(function(){
       var searchTerm = $(this).val();
       if(searchTerm.length == 0 || searchTerm.length > 2){
           $("#searchForm").trigger('change');
       }
    });

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

    $(".tab .tablinks").click(function () {
        $('.tab .tablinks').not(this).removeClass('active');
        $(this).toggleClass('active');
        $(".tabcontent").hide();
        $("#" + $(this).attr('data-name')).show();
        constructBookmarkTable();

    });
});
