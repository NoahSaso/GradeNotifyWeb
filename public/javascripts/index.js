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
    
    if (jR) {
        toastr['success']('You have been successfully registered.');
    }

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

// Enable or disable account
$("button.status-bn").click(function (e) {
    var isEnabling = $(e.target).text() == 'Enable';
    $.ajax('/update', {
        type: 'POST',
        dataType: 'json',
        data: { key: 'enabled', value: (isEnabling ? 1 : 0) },
        success: function(data, textStatus, jqXHR) {
            if (data['status'] === 'ok') {
                toastr['success'](data['message']);
                if (isEnabling) {
                    $(e.target).text('Disable');
                    $(e.target).removeClass('btn-primary');
                    $(e.target).addClass('btn-danger');
                    $('b#status').text('enabled');
                } else {
                    $(e.target).text('Enable');
                    $(e.target).removeClass('btn-danger');
                    $(e.target).addClass('btn-primary');
                    $('b#status').text('disabled');
                }
            } else {
                toastr['error'](data['message']);
            }
        }
    });
});

// Update contact
$("button#update-contact").click(function (e) {
    var email = $('input#email-a').val();
    var phone = $('input#phone-a').val();
    var carrier = $('select#carrier-a').val();
    var phoneEnabled = $('select#phone-enabled-a').val();
    var phoneEmail = phone + '@' + carrier;
    $.ajax('/update', {
        type: 'POST',
        dataType: 'json',
        data: { data: JSON.stringify({ email: email, phone_email: phoneEmail, phone_enabled: phoneEnabled }) },
        success: function(data, textStatus, jqXHR) {
            if (data['status'] === 'ok') {
                toastr['success'](data['message']);
            } else {
                toastr['error'](data['message']);
            }
        }
    });
});

// Update password
$("button#update-password").click(function (e) {
    var password = $('input#new-password').val();
    $.ajax('/update', {
        type: 'POST',
        dataType: 'json',
        data: { key: 'password', value: password },
        success: function(data, textStatus, jqXHR) {
            if (data['status'] === 'ok') {
                toastr['success'](data['message']);
            } else {
                toastr['error'](data['message']);
            }
        }
    });
});


// Intercept login/logout form and signup form and send as ajax
$("form").submit(function (e) {
    e.preventDefault();
    var formArray = $(e.target).serializeArray();
    var action = $(e.target).attr('action');
    var data = formArray.reduce(function(result, currArray) {
        result[currArray.name] = currArray.value;
        return result;
    }, {});
    if(data.hasOwnProperty("phone") && data.phone.length > 0) {
        data.phone_email = data.phone + '@' + data.carrier;
    }
    if(data.hasOwnProperty("phone") || data.hasOwnProperty("carrier")) {
        delete data.phone;
        delete data.carrier;
    }
    console.log(data);
    $.ajax(action, {
        type: 'POST',
        dataType: 'json',
        data: data,
        success: function(data, textStatus, jqXHR) {
            if (data['status'] === 'ok') {
                if (action == '/login' || action == '/logout') {
                    location.reload();
                } else if (action == '/register') {
                    location.href = '/#account';
                }
            } else {
                toastr['error'](data['message']);
            }
        }
    });
});

var handler = StripeCheckout.configure({
  key: publishableKey,  
  image: 'https://stripe.com/img/documentation/checkout/marketplace.png',
  locale: 'auto',
  zipCode: true,
  currency: 'USD',
  token: function(token) {
    // You can access the token ID with `token.id`.
    // Get the token ID to your server-side code for use.
    var amount = $('input#amount').val();
    if (!amount) {
        amount = 1.00;
    }
    amount = parseFloat(amount).toFixed(2);
    if (confirm("Please confirm that you would like to donate $" + amount + " to the Willow Glen Cares organization.")) {
        $.ajax('/charge', {
            type: 'POST',
            dataType: 'json',
            data: { stripeToken: token.id, amount: amount },
            success: function (data, textStatus, jqXHR) {
                console.log('complete');
                if (data['status'] === 'ok') {
                    location.reload();
                } else {
                    toastr['error'](data['message']);
                }
            }
        });
    } else {
        alert("You have not been charged. You may still upgrade your account for free with the other button.");
    }
  }
});

$('button#stripe-charge').click(function(e) {
  handler.open({
    name: 'Grade Notify',
    description: 'WG Cares Donation'
  });
});

$('button#account-upgrade').click(function (e) {
    $.ajax('/charge', {
        type: 'POST',
        dataType: 'json',
        data: { stripeToken: 'FREE', amount: 'FREE' },
        success: function (data, textStatus, jqXHR) {
            if (data['status'] === 'ok') {
                location.reload();
            } else {
                toastr['error'](data['message']);
            }
        }
    });
})