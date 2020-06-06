const kMillisecondsPerDay = 1000 * 60 * 60 * 24;
const kMillisecondsPerWeek = kMillisecondsPerDay * 7;
const kOneWeekAgo = (new Date).getTime() - kMillisecondsPerWeek;

var bookmarks = [];
var tabs = [];
var folders = [];

document.addEventListener("DOMContentLoaded", function (event) {
    searchHistory('', ((new Date).getTime() - kMillisecondsPerDay), (new Date).getTime(), 50);

    setTimeout(function () {
        buildNavigationOptions();
        getBookTree();
        setTabs();
    }, 1000);

});


var searchHistory = function (searchTerm, startTime, endTime, limit) {
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
    $(".item_table .noData").hide();
    historyTable.find(".item").remove();

    historyItems.forEach(function (item) {

        var tr = trOriginal.clone();
        tr.removeClass('core_history_item');
        tr.addClass('item');
        tr.find("td.select input[name='history[]']").val(item.url);
        tr.find("p.info_title a.title")
            .text(item.title ? item.title : item.url)
            .attr('href', item.url)
            .attr('title', item.url);
        tr.find("p.info_title span.favicon").css('content', 'url("chrome://favicon/' + item.url + '")');
        tr.find("p.info_time span.time_info").text(getVisitTime(item));
        tr.find("p.info_url a.full_url").text(item.url).attr('href', item.url);

        historyTable.append(tr);
    });
    if (historyItems.length == 0) {
        var limitSelect = $("#time_filter option:selected");
        var message_suffix = '';
        if (!($("#searchTerm").val() || $("#website").val())) {
            message_suffix = ' for : ' + limitSelect.text();
        }
        $(".item_table .noData p").text("No history found" + message_suffix);
        $(".item_table .noData").show();
    }
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
    var websiteSelect = $("#websiteData");
    var hostnames = [];
    var months = [];
    historyItems.forEach(function (item) {
        hostnames.push(((new URL(item.url)).hostname));
        months.push(item);
    });

    var unique = hostnames.filter(onlyUnique);
    unique.forEach(function (item) {
        websiteSelect.append('<option value="' + item + '">')
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
        startTime = (new Date).getTime() - (kMillisecondsPerDay * (parseInt(timeFilterArray[0]) + 1));

    }
    if (timeFilterArray[0] != '0' && timeFilterArray[1] == 'w') {
        startTime = (new Date).getTime() - (kMillisecondsPerWeek * (parseInt(timeFilterArray[0]) + 1));

    }

    // setting start and end of the dat
    var startDate = new Date(startTime)
    startDate.setHours(0, 0, 0, 0);
    var endDate = new Date(endTime)
    endDate.setHours(23, 59, 59, 999);

    return {endTime: endDate.getTime(), startTime: startDate.getTime()};
}


var traverse = function (item) {
    for (i in item) {
        if (!!item[i] && typeof (item[i]) == "object") {
            if (item[i].hasOwnProperty('url')) {
                bookmarks.push({id: item[i].id, parentId: item[i].parentId, title: item[i].title, url: item[i].url});
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

var setTabs = function () {
    if (tabs.length == 0) {
        chrome.tabs.query({},function (data) {
            tabs = data;
        });
    }
}
var constructBookmarkTable = function () {

    var bookmarkTable = $("#bookmarkContainer .item_table");
    var trOriginal = $("#coreItemTable .core_bookmark_item");

    if ($.fn.DataTable.isDataTable("#bookmarkContainer .item_table")) {
        return;
    }

    bookmarkTable.find(".item").remove();
    var hostnames = [];
    bookmarks.forEach(function (item) {
        hostnames.push(((new URL(item.url)).hostname));
        var tr = trOriginal.clone();
        tr.removeClass('core_bookmark_item');
        tr.addClass('item');
        tr.find("td.select input[name='bookmark[]']").val(item.id);
        tr.find("p.info_title a.title")
            .text(item.title ? item.title : item.url)
            .attr('href', item.url)
            .attr('title', item.url);
        tr.find("p.info_title span.favicon").css('content', 'url("chrome://favicon/' + item.url + '")');
        var folderArr = getFolders(folders[item.parentId], []);
        tr.find("p.info_folder span.folder_container").html(folderArr.join('<span class="icon arrow"></span> '));
        tr.find("p.info_url a.full_url").text(item.url).attr('href', item.url);
        bookmarkTable.append(tr);
    });
    if (bookmarks.length > 0) {
        var bookmarkDataTable = bookmarkTable.dataTable({
            "ordering": false,
            "info": false,
            "pageLength": 50,
            "lengthMenu": [10, 25, 50, 100, 500, 1000],
            "pagingType": "simple",
            "dom": '<"tools_wrapper"<"left_tools"f><"mid_tools"p><"right_tools"l>>',
            "language": {
                search: '',
                searchPlaceholder: 'Search bookmark',
                zeroRecords: '<p>No bookmark found</p>',
                lengthMenu: '_MENU_',

            }
        });

        bookmarkDataTable.on('search.dt', function () {
            // after search apply on datatable
            resetRemoveCheckBoxes('bookmark');
        });

        $("#bookmarkContainer div.left_tools").append($("#bookmarkDatatableFilters").html());

        var unique = hostnames.filter(onlyUnique);
        unique.forEach(function (item) {
            $("#bookmarkWebsiteData").append('<option value="' + item + '">')
        });

        $('#bookmarkWebsite').keyup(function () {
            bookmarkDataTable.api().column(1)
                .search($(this).val())
                .draw();
        });

    }

}

var constructTabTable = function () {

    var tabTable = $("#tabContainer .item_table");
    var trOriginal = $("#coreItemTable .core_tab_item");

    if ($.fn.DataTable.isDataTable("#tabContainer .item_table")) {
        return;
    }

    tabTable.find(".item").remove();
    var hostnames = [];
    tabs.forEach(function (item) {
        hostnames.push(((new URL(item.url)).hostname));
        var tr = trOriginal.clone();
        tr.removeClass('core_tab_item');
        tr.addClass('item');
        tr.find("td.select input[name='tab[]']").val(item.id);
        tr.find("p.info_title span.favicon").css('content', 'url("' + item.favIconUrl + '")');
        tr.find("p.info_title a.title")
            .text(item.title ? item.title : item.url)
           // .attr('href', item.url)
            .attr('title', item.url);
        tr.find('td.info').attr('data-search', (item.title+' :'+item.url));
        tr.find('input[name=active]').prop('checked', item.active);
        tr.find('input[name=pinned]').prop('checked', item.pinned);
        tr.find('input[name=muted]').prop('checked', item.mutedInfo.muted);
        tr.find('input[name=autoDiscardable]').prop('checked', item.autoDiscardable);
        tr.find('input[name=highlighted]').prop('checked', item.highlighted);
        tr.attr('data-tabId', item.id).attr('data-windowId', item.windowId)
        tabTable.append(tr);
    });
    if (tabs.length > 0) {
        var tabDataTable = tabTable.dataTable({
            "ordering": false,
            "info": false,
            "pageLength": 10,
            "lengthMenu": [10, 25, 50, 100, 500, 1000],
            "pagingType": "simple",
            "dom": '<"tools_wrapper"<"left_tools"f><"mid_tools"p><"right_tools"l>>',
            "language": {
                search: '',
                searchPlaceholder: 'Search tab',
                zeroRecords: '<p>No tab found</p>',
                lengthMenu: '_MENU_',

            }
        });

        tabDataTable.on('search.dt', function () {
            // after search apply on datatable
            resetRemoveCheckBoxes('tabs');
        });

        $("#tabContainer div.left_tools").append($("#tabDatatableFilters").html());

        var unique = hostnames.filter(onlyUnique);
        unique.forEach(function (item) {
            $("#tabWebsiteData").append('<option value="' + item + '">')
        });

        $('#tabWebsite').keyup(function () {
            tabDataTable.api().column(1)
                .search($(this).val())
                .draw();
        });

    }

}

var resetRemoveCheckBoxes = function (recordType) {
    $("#" + recordType + "Container tr input[type='checkbox']").prop('checked', false);
    updateRemoveButton(recordType);
}
var updateRemoveButton = function (recordType) {
    var items = $("#" + recordType + "Container tr.item input[name='" + recordType + "[]']");
    var removeButtonObj = $("#remove" + recordType.charAt(0).toUpperCase() + recordType.substr(1));
    if (items.filter(':checked').length > 0) {
        var record = ' record';
        if (items.filter(':checked').length > 1) {
            record = ' records';
        }
        if (recordType != 'tab') {
            removeButtonObj.show().text("Remove (" + items.filter(':checked').length + ") " + recordType + record);
        }
    } else {
        if (recordType != 'tab') {
            removeButtonObj.text("Remove " + recordType + " record");
        }
    }
}
var getRecordType = function (obj) {
    var tabcontentId = $(obj).closest('.tabcontent').attr('id');
    var recordType = tabcontentId.replace("Container", "");
    return recordType;
}

var updateOptionTable = function () {
    $.getJSON("assets/optionsData.json", function (data) {
        var otherOptionsTable = $("#otherOptionsTable");
        var items = [];
        $.each(data, function (key, val) {
            items.push({
                item: {
                    keyword: val.title + ': ' + val.keyword,
                    display: '<p><a class="linkTo" title="'+val.keyword+'" href="' + val.link + '">' + val.title + '</a></p>'
                }
            });
        });

        otherOptionsTable.DataTable({
            "ordering": false,
            "info": false,
            "pageLength": 10,
            "pagingType": "simple",
            "dom": '<"tools_wrapper"<"left_tools"f><"mid_tools"p><"right_tools"l>>',
            "language": {
                search: '',
                searchPlaceholder: 'Search browser option',
                zeroRecords: '<p>No option found</p>',
                lengthMenu: '_MENU_',

            },
            "data": items,
            "order": [[0, 'asc' ]],
            columnDefs: [{
                targets: 0,
                className: 'info'
            }],
            columns: [{
                data: 'item',
                render: {
                    "display": 'display',
                    "filter": 'keyword'
                }
            }]
        });
    });
}

$(document).ready(function () {

    updateOptionTable();

    $("#searchTerm, #website").keyup(function () {
        var searchTerm = $(this).val();
        if (searchTerm.length == 0 || searchTerm.length > 2) {
            $("#searchForm").trigger('change');
        }
    });


    $("#searchForm").on("submit", function (event) {
        event.preventDefault()
    });

    $("#searchForm").change(function (event) {
        var searchTermInput = $("#searchTerm");
        var websiteSelect = $("#website");
        var limitSelect = $("#limit");

        var startAndEndTime = getStartAndEndTimeFromFilterOption();
        resetRemoveCheckBoxes('history');
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
        constructTabTable();

    });

    $("#allHistories, #allBookmarks, #allTabs").on("change", function () {
        var recordType = getRecordType(this);

        var items = $("#" + recordType + "Container tr.item input[name='" + recordType + "[]']");
        if ($(this).is(":checked")) {
            items.prop('checked', true);
        } else {
            items.prop('checked', false);
        }

        updateRemoveButton(recordType);

    });

    $(document).on('change', ".item_table tbody .select input[type='checkbox']", function () {
        updateRemoveButton(getRecordType(this));
    });

    $(".action").on("click", function () {
        var recordType = getRecordType(this);
        var items = $("#" + recordType + "Container tr.item input[name='" + recordType + "[]']");

        $.each(items.filter(':checked'), function () {
            if (recordType == "history") {
                chrome.history.deleteUrl({url: $(this).val()});
                $("#searchForm").trigger('change');
            }
            if (recordType == "bookmark") {
                chrome.bookmarks.remove($(this).val());
            }
            if (recordType == "tab") {
                chrome.tabs.remove(parseInt($(this).val()), function(){});
            }

            $(this).prop('checked', false).closest('tr.item').hide();
        });

        updateRemoveButton(recordType);

    });

    $(document).on("change", ".tabActions input", function () {
        var actionId = parseInt($(this).closest("tr").attr('data-tabId'));
        var windowId = parseInt($(this).closest("tr").attr('data-windowId'));
        var name = ($(this).attr('name'));

        chrome.tabs.update(actionId, {[name]: $(this).is(':checked')});
        if (name == 'active') {
            chrome.windows.update(windowId, {focused: true});
        }

    });

    $(document).on("click", "#tabContainer a.goto", function () {
        var actionId = parseInt($(this).closest("tr").attr('data-tabId'));
        var windowId = parseInt($(this).closest("tr").attr('data-windowId'));
        var name = ($(this).attr('name'));
        chrome.tabs.update(actionId, {[name]: true});
        chrome.windows.update(windowId, {focused: true});
    });

    $(document).on("click", "#website, #bookmarkWebsite", function () {
        $(this).attr('placeholder', $(this).val());
        $(this).attr('old-value', $(this).val());
        $(this).val('');
    });

    $(document).on("blur", "#website, #bookmarkWebsite", function () {
        $(this).attr('placeholder', 'Website');
        if (!$(this).val()) {
            $(this).val($(this).attr('old-value'));
        }
    });

    $(document).on("click", ".linkTo", function () {
        $(this).attr('href');
        chrome.tabs.create({'url': $(this).attr('href'), 'active': true});
    });

});
