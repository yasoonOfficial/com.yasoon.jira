var authToken = '';
$(document).ready(function () {
	var token = getUrlParameterByName('jwt');
	if(token) {
		$.ajax({
			url: 'http://localhost:1337/jira/isInstanceRegistered',
			data: { jwt : token },
			type: 'GET'
		}).done(function(data) {
			if(data.registered) {
				$('#RegisteredArea').show();
			} else {
				$('#UnregisteredArea').show();
			}
			$('#RegisterCompanyButton').click(function (e) {
			    //Transform data
			    var formArray = $('#RegisterCompanyForm').serializeArray();
			    var formData = {};
			    $.each(formArray, function (i, elem) {
			        formData[elem.name] = elem.value;
			    });

			    //Clean all invalid states
			    $('.form-group').removeClass('has-error');
			    $('.help-block').css('visibility', 'hidden');

			    //Make checks
			    if (!formData.company) {
			        $('#company').parent().addClass('has-error');
			        return;
			    }
			    if (!formData.firstName) {
			        $('#firstname').parent().addClass('has-error');
			        return;
			    }
			    if (!formData.lastName) {
			        $('#lastname').parent().addClass('has-error');
			        return;
			    }
			    if (!formData.emailAddress) {
			        $('#emailaddress').parent().addClass('has-error');
			        return;
			    }
			    if (!formData.password) {
			        $('#password').parent().addClass('has-error');
			        return;
			    }
			    if (!formData.password1) {
			        $('#password1').parent().addClass('has-error');
			        return;
			    }
			    if (formData.password != formData.password1) {
			        $('#password1').parent().addClass('has-error');
			        $('.help-block').css('visibility', 'visible');
			        return;
			    }
			    //Send Data
			    $.ajax({
			        url: 'http://localhost:1337/api/company/register',
			        contentType: 'application/json',
			        data: JSON.stringify(formData),
			        processData: false,
			        type: 'POST'
			    }).done(function (result) {
			        if (result.success === false) {
			            alert('Account already exists. Please login.');
			            return;
			        }
			        //User created... Get authorization token
			        $.ajax({
			            url: 'http://localhost:1337/api/user/auth',
			            contentType: 'application/json',
			            data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
			            processData: false,
			            type: 'POST'
			        }).done(function (auth) {
			            authToken = auth;
			            $.ajax({
			                url: 'http://localhost:1337/jira/assigncompany',
			                contentType: 'application/json',
			                data: JSON.stringify({ jwt: token }),
			                headers: { userAuthToken: authToken },
			                processData: false,
			                type: 'POST'
			            }).done(function () {
			                $('#RegisteredArea').show();
			                $('#UnregisteredArea').hide();
			            }).fail(function () {
			                alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
			            });
			        }).fail(function () {
			            alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
			        });


			    }).fail(function () {
			        alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
			    });

			    e.preventDefault();
			});
			$('#LoginYasoon').click(function (e) {
			    $('#UnregisteredArea').hide();
			    $('#LoginArea').show();
			});
			$('#LoginYasoonButton').click(function (e) {
			    //Transform data
			    var formArray = $('#RegisterCompanyForm').serializeArray();
			    var formData = {};
			    $.each(formArray, function (i, elem) {
			        formData[elem.name] = elem.value;
			    });

			    //Login
			    $.ajax({
			        url: 'http://localhost:1337/api/user/auth',
			        contentType: 'application/json',
			        data: JSON.stringify({ email: formData.emailAddress, password: formData.password }),
			        processData: false,
			        type: 'POST'
			    }).done(function (auth) {
			        authToken = auth;
			        $.ajax({
			            url: 'http://localhost:1337/jira/assigncompany',
			            contentType: 'application/json',
			            data: JSON.stringify({ jwt: token }),
			            headers: { userAuthToken: authToken },
			            processData: false,
			            type: 'POST'
			        }).done(function () {
			            $('#RegisteredArea').show();
			            $('#LoginArea').hide();
			        }).fail(function () {
			            alert('Oops, this shouldn\'t happen. Our Engineers are already informed. Please try again later.');
			        });
			    }).fail(function () {
			        alert('Invalid credentials.');
			    });
			});
		});
	}
});


function getUrlParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}