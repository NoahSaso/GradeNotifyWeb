function hide(elem) { elem.addClass('hidden'); elem.find('input').each(function (idx, elem) { $(elem).removeAttr('required'); }); }
function show(elem) { elem.removeClass('hidden'); elem.find('input').each(function (idx, elem) { $(elem).attr('required', 'required'); }); }
function set_name(name) { $('input[type=submit]').attr('value', name); }
function set_action(action) { $('form').attr('action', action) }

$(document).ready(function () {
    
    $("#action").on('change', function (e) {
        val = $(e.target).val();
        switch (val) {
            case '0': // sign up
                show($('#names-block'));
                show($('#email-block'));
                show($('#username-block'));
                show($('#password-block'));
                hide($('#old-password-block'));
                hide($('#new-password-block'));
                set_name('Sign Up');
                set_action('/signup');
                break;
            case '1': // enable
            case '2': // disable
                hide($('#names-block'));
                hide($('#email-block'));
                show($('#username-block'));
                show($('#password-block'));
                hide($('#old-password-block'));
                hide($('#new-password-block'));
                if (val == '1') {
                    set_name('Enable Account');
                    set_action('/enable');
                } else if (val == '2') {
                    set_name('Disable Account');
                    set_action('/disable');
                }
                break;
            case '3': // update password
                hide($('#names-block'));
                hide($('#email-block'));
                show($('#username-block'));
                hide($('#password-block'));
                show($('#old-password-block'));
                show($('#new-password-block'));
                set_name('Update Password');
                set_action('/update');
            default:
                break;
        }
    });

});