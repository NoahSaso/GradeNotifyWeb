// Tab clicked
$("ul.navbar-nav > li > a.nav-link").click(function (e) {
    window.location.hash = $(e.target).data("target").substr(1);
    window.history.pushState({}, document.title, window.location.hash );
    $('.navbar-collapse').collapse('hide');
});

$(document).ready(function () {
    $('ul.navbar-nav a[data-target="' + window.location.hash + '"]').tab('show');
});

// Form stuff
$("form#status-form").submit(function(e) {
    var btn_pressed_label = $(e.target).find('input[type=submit][clicked=true]').attr('value');
    if (btn_pressed_label == 'Enable') {
        $(this).attr('action', '/enable');
    } else if (btn_pressed_label == 'Disable') {
        $(this).attr('action', '/disable');
    }
});

$(document.body).on('click', 'form input[type=submit]', function(e) {
    $("input[type=submit]", $(this).parents("form")).removeAttr("clicked");
    $(this).attr("clicked", "true");
});
