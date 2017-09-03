// Tab clicked
$("ul.navbar-nav > li > a.nav-link").click(function (e) {
    window.location.hash = $(e.target).data("target").substr(1);
    window.history.pushState({}, document.title, window.location.hash );
    $('.navbar-collapse').collapse('hide');
});

$(document).ready(function () {
    // set tab based on hash
    $('ul.navbar-nav a[data-target="' + window.location.hash + '"]').tab('show');

    //set toastr options
    toastr.options = {
        closeButton: true,
        debug: false,
        newestOnTop: false,
        progressBar: true,
        positionClass: 'toast-top-right',
        preventDuplicates: false,
        onclick: null,
        showDuration: 400,
        hideDuration: 600,
        timeOut: 10000,
        extendedTimeOut: 7500,
        showEasing: 'swing',
        hideEasing: 'linear',
        showMethod: 'fadeIn',
        hideMethod: 'fadeOut'
    };

    // loading indicator
    var loading = $('#loading').hide();
    $(document)
        .ajaxStart(function () {
            loading.show();
        })
        .ajaxStop(function () {
            loading.hide();
        });
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

// Form button has clicked value so we can identify later
$(document.body).on('click', 'form input[type=submit]', function(e) {
    $("input[type=submit]", $(this).parents("form")).removeAttr("clicked");
    $(this).attr("clicked", "true");
});

// Intercept all forms and send via ajax
$("form").submit(function (e) {
    e.preventDefault();
    formArray = $(e.target).serializeArray();
    action = $(e.target).attr('action');
    data = formArray.reduce(function(result, currArray) {
        result[currArray.name] = currArray.value;
        return result;
    }, {});
    $.ajax(action, {
        type: 'POST',
        dataType: 'json',
        data: data,
        success: function(data, textStatus, jqXHR) {
            console.log(data);
            if (data['status'] === 'ok') {
                toastr['success'](data['message']);
            } else {
                toastr['error'](data['message']);
            }
        }
    });
});
