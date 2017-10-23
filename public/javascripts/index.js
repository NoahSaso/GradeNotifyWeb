// Tab clicked
$("ul.navbar-nav > li > a.nav-link").click(function (e) {
    window.location.hash = $(e.target).data("target").substr(1);
    window.history.pushState({}, document.title, window.location.hash );
    $('.navbar-collapse').collapse('hide');
});

// Enable/disable user
$("button.account-status").click(function (e) {
    var student_id = $(e.target).data('student-id');
    var isEnabled = $(e.target).text() == 'Enabled';
    $.ajax('/admin/update', {
        type: 'POST',
        dataType: 'json',
        data: { student_id: student_id, key: 'enabled', value: (isEnabled ? 0 : 1) },
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
        var student_id = $(e.target).data('student-id');
        var key = $(e.target).data('key');
        var value = $(e.target).val();
        if (key == 'recipients') {
            value = JSON.stringify(value);
        }    
        $.ajax('/admin/update', {
            type: 'POST',
            dataType: 'json',
            data: { student_id: student_id, key: key, value: value },
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

function updateRecipients() {
    var recipients = [];
    $('tr#recipient').each(function (idx, element) {
        var elem = $(element);
        var address = elem.find('input#address').val();
        var carrier = elem.find('select#carrier').val();
        if (carrier == 'EMAIL') {
            var type = 'email';
        } else {
            var type = 'phone';
            address += '@' + carrier;
        }
        var enabled = parseInt(elem.find('select#enabled').val());
        recipients.push({
            address: address,
            type: type,
            enabled: enabled
        });
    });
    $.ajax('/update', {
        type: 'POST',
        dataType: 'json',
        data: { key: 'recipients', value: JSON.stringify(recipients) },
        success: function(data, textStatus, jqXHR) {
            if (data['status'] === 'ok') {
                toastr['success'](data['message']);
            } else {
                toastr['error'](data['message']);
            }
        }
    });
}

$('button#delete-recipient').click(function (e) {
    $($(e.target).closest('tr#recipient')).remove();
    updateRecipients();
});

$('button#add-recipient').click(function (e) {
    var $newTr = $($(e.target).closest('tr#new-recipient'));
    var $address = $newTr.find('input#address');
    var $carrier = $newTr.find('select#carrier');
    var $enabled = $newTr.find('select#enabled');

    var $tr = $($newTr.siblings('tr#recipient')[0]).clone();
    $tr.find('input#address').val($address.val());
    $tr.find('select#carrier').val($carrier.val());
    $tr.find('select#enabled').val($enabled.val());
    $newTr.before($tr);

    $address.val('');
    $carrier.val('EMAIL');
    $enabled.val(1);

    updateRecipients();
});

$('button#save-recipients').click(function (e) {
    updateRecipients();
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
    data.recipients = [{
        'address': data.email,
        'type': 'email',
        'enabled': (data.phone_enabled == '0' ? 1 : 0)
    }];
    if(data.hasOwnProperty("phone") && data.phone.length > 0) {
        data.recipients.push({
            'address': data.phone + '@' + data.carrier,
            'type': 'phone',
            'enabled': (data.phone_enabled == '1' ? 1 : 0)
        });
    }
    data.recipients = JSON.stringify(data.recipients);
    if(data.hasOwnProperty("phone") || data.hasOwnProperty("carrier") || data.hasOwnProperty("phone_enabled")) {
        delete data.phone;
        delete data.carrier;
        delete data.phone_enabled;
    }
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
