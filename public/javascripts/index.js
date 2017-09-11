// Tab clicked
$("ul.navbar-nav > li > a.nav-link").click(function (e) {
    window.location.hash = $(e.target).data("target").substr(1);
    window.history.pushState({}, document.title, window.location.hash );
    $('.navbar-collapse').collapse('hide');
});

// Enable/disable user
$("button.account-status").click(function (e) {
    var studentId = $(e.target).data('student-id');
    var isEnabled = $(e.target).text() == 'Enabled';
    $.ajax('/admin/update', {
        type: 'POST',
        dataType: 'json',
        data: { studentId: studentId, key: 'enabled', value: (isEnabled ? 0 : 1) },
        success: function(data, textStatus, jqXHR) {
            if (data['status'] === 'ok') {
                toastr['success'](data['message']);
                $(e.target).text(isEnabled ? 'Disabled' : 'Enabled');
            } else {
                toastr['error'](data['message']);
            }
        }
    });
});

// Set/unset user as premium
$("button.account-premium").click(function (e) {
    var studentId = $(e.target).data('student-id');
    var isPremium = $(e.target).text() == 'Premium';
    $.ajax('/admin/update', {
        type: 'POST',
        dataType: 'json',
        data: { studentId: studentId, key: 'premium', value: (isPremium ? 0 : 1) },
        success: function(data, textStatus, jqXHR) {
            if (data['status'] === 'ok') {
                toastr['success'](data['message']);
                $(e.target).text(isPremium ? 'Not Premium' : 'Premium');
            } else {
                toastr['error'](data['message']);
            }
        }
    });
});

// Enable/disable user
$("input.account-text").keypress(function (e) {
    if (e.keyCode == 13) { // enter key
        var studentId = $(e.target).data('student-id');
        var key = $(e.target).data('key');
        var value = $(e.target).val();
        $.ajax('/admin/update', {
            type: 'POST',
            dataType: 'json',
            data: { studentId: studentId, key: key, value: value },
            success: function (data, textStatus, jqXHR) {
                if (data['status'] === 'ok') {
                    toastr['success'](data['message']);
                } else {
                    toastr['error'](data['message']);
                }
            }
        });
    }
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

// Form set action based on button click
$("form#status-form").submit(function (e) {
    var btn_pressed_label = $(e.target).find('input[type=submit][clicked=true]').attr('value');
    if (btn_pressed_label == 'Enable') {
        $(this).attr('action', '/enable');
    } else if (btn_pressed_label == 'Disable') {
        $(this).attr('action', '/disable');
    }
});

// Prevent enter key for enable/disable form
$('form#status-form').keypress(function(e) {
  if (e.keyCode == 13) {               
    e.preventDefault();
    return false;
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
    var formArray = $(e.target).serializeArray();
    var action = $(e.target).attr('action');
    var data = formArray.reduce(function(result, currArray) {
        result[currArray.name] = currArray.value;
        return result;
    }, {});
    $.ajax(action, {
        type: 'POST',
        dataType: 'json',
        data: data,
        success: function(data, textStatus, jqXHR) {
            if (data['status'] === 'ok') {
                if (action == '/login' || action == '/logout') {
                    location.reload();
                } else {
                    toastr['success'](data['message']);
                    if (action.indexOf('/update/') != 0) {
                        $(e.target).find("input[type=text], input[type=password]").val("");
                        $(e.target).find("input[type=checkbox]").attr('checked', false);
                    }
                }
            } else {
                toastr['error'](data['message']);
            }
        }
    });
});
