$(function () {
    /**
     * Sticky header
     */
    function stickyHeader() {
        if (sticky.offset().top > scrollTop) {
            sticky.addClass('site-header--stuck');
            $('body').addClass('header-stuck');
        } else {
            sticky.removeClass('site-header--stuck');
            $('body').removeClass('header-stuck');
        }
    }

    if ($(window).width() > 992 && $('.site-header').length > 0) {
        var sticky = $('.site-header'),
            scrollTop = sticky.height();

        stickyHeader();

        $(window).scroll(function () {
            stickyHeader();
        });
    }

    /**
     * Tooltips
     */
    if ($('[data-toggle="tooltip"]').length > 0) {
        $('[data-toggle="tooltip"]').tooltip({
            html: "true"
        });
    }



    /**
     *  Table settings
     */
    if ($('.js-table-settings').length > 0) {
        $('.js-table-settings-link').on('click', function (e) {
            $(this)
                .parent().toggleClass('open')
                .parent().parent().next().toggleClass('open');
            e.preventDefault();
        });
    }

    /**
     *  Navigation with selector for tabs
     */
    if ($('.js-tab-select-navigation').length > 0) {
        $('.js-tab-select-navigation').on('change', function (e) {
            var target = $(this).val(),
                tabContent = $(this).data("content");
            $(tabContent).find('.tab-pane').removeClass('active in');
            $(target).addClass('active in');
        });
    }

    /**
     *  Navigation lateral with selector
     */
    if ($('.js-link-select-navigation').length > 0) {
        $('.js-link-select-navigation select').on('change', function (e) {
            if ($(this).val() !== '') {
                window.location.href = $(this).val();
            }
        });
    }


    /**
     * Notifications
     */
    var notifications = $('#notifications');
    if (notifications.length > 0) {
        notifications.appendTo('.notifications-placeholder');
        notifications.show();
    }

});

/**
 * App main class.
 */
function App() {

    /** 
     * Shows a message using the preloaded #modal-message HTML
     */
    this.showMessage = function (message, description, alert) {
        var deferred = $.Deferred();

        $('#close-button').show();
        $('#prompt-buttons').hide();
        $('#modal-message-text').html(message);
        if (description)
            $('#modal-message-description').html(description);
        else
            $('#modal-message-description').html('');

        $('#modal-message').modal({ backdrop: 'static', keyboard: false });

        if (alert)
            $('#modal-message-text').addClass('alert alert--danger');
        else
            $('#modal-message-text').removeClass('alert alert--danger');

        //Handle button clicks and resolve promises
        $('#close-button').off();
        $('#close-button').on('click', function () {
            $('#modal-message').modal('hide');
            deferred.resolve(true);
        });

        $('#modal-message').off();
        $('#modal-message').on('hidden.bs.modal', function () {
            deferred.resolve(true);
        });

        return deferred.promise();
    }

    this.showErrorMessage = function (message, description) {
        return this.showMessage(message, description, true);
    }

    this.scrollToAnchorElement = function (anchorId) {
        var safeHeaderHeight = $('.site-header').height() + $('.navbar-sec').height() + 73;
        $div = $('#' + anchorId);
        $('html, body').stop().animate({
            scrollTop: $div.offset().top - safeHeaderHeight
        }, 800);
    }

    /** 
     * Shows a question with a YES/NO answer using the preloaded #modal-message HTML
     */
    this.showQuestion = function (message, description) {
        var deferred = $.Deferred();
        $('#close-button').hide();
        $('#prompt-buttons').show();
        $('#modal-message-text').html(message);
        $('#modal-message-description').html(description);
        $('#modal-message').modal({ backdrop: 'static', keyboard: false });

        //Handle button clicks and resolve promises
        $('#yes-button, #no-button, #modal-message').off();
        $('#yes-button').on('click', function () {
            $('#modal-message').modal('hide');
            deferred.resolve(true);
        });
        $('#no-button').on('click', function () {
            $('#modal-message').modal('hide');
            deferred.resolve(false);
        });


        return deferred.promise();
    }

    this.isMobile = function () {
        return (/Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent));
    }

    this.copyToClipboard = function (text) {
        if (window.clipboardData && window.clipboardData.setData) {
            // IE specific code path to prevent textarea being shown while dialog is visible.
            return clipboardData.setData("Text", text);

        } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
            var textarea = document.createElement("textarea");
            textarea.textContent = text;
            textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
            document.body.appendChild(textarea);
            textarea.select();
            try {
                return document.execCommand("copy");  // Security exception may be thrown by some browsers.
            } catch (ex) {
                console.warn("Copy to clipboard failed.", ex);
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }
}

/**
 * Manages the registration process
 */

function SignupManager(settings) {
    var self = this;
    var errorInForm = settings.errorInForm;

    var SignupViewModel = function () {
        var self = this;

        settings.coworker.Avatar = null;
        settings.coworker.TourDate = null;
        settings.coworker.hasBillingDetails = false;
        settings.coworker.isPayingMember = false;
        settings.coworker.ProfileTagsArray = settings.coworker.ProfileTags != null ? (settings.coworker.ProfileTags + '').split(',') : [];

        //Build custom field helpers
        _.forEach(settings.customFields, function (field) {
            if (field.AvailableOptions)
                field.AvailableOptionsArray = field.AvailableOptions.split(',');

            if (field.FieldType === 'Dropdown') {
                if (settings.coworker['Custom' + field.CustomFieldIndex])
                    settings.coworker['Custom' + field.CustomFieldIndex + 'Array'] = settings.coworker['Custom' + field.CustomFieldIndex].split(',');
                else
                    settings.coworker['Custom' + field.CustomFieldIndex + 'Array'] = [];
            }
        });

        self.coworker = ko.mapping.fromJS(settings.coworker);
        self.profileTags = ko.mapping.fromJS(settings.profileTags);
        self.customFields = _.toArray(_.groupBy(settings.customFields, 'GroupName'));
        self.busy = ko.observable(false);
        self.alreadyRegistered = ko.observable(false);
        self.team = {
            Name: ko.observable(),
            Description: ko.observable(),
        };

        self.datePickerOptions = {
            today: '',
            clear: '',
            selectYears: 200,
            selectMonths: true,
            close: "{% T Close %}",
            format: 'dddd, dd mmmm yyyy'
        };
        this.timePickerOptions = {
            today: '',
            clear: '',
            close: "{% T Close %}",
        };



        /**
         * Validates and submits registration data
         */
        self.submit = function () {

            if (ko.validatedObservable) {
                var validatedvm = ko.validatedObservable(vm.coworker);
                if (validatedvm.isValid() === false) {
                    vm.coworker.errors.showAllMessages(true);
                    app.showErrorMessage(errorInForm);
                    return false;
                }
            }

            //Process values for custom fields 
            for (var i = 1; i <= 30; i++) {
                //Convert arrays into comma separated strings.
                var prop = ko.unwrap(vm.coworker['Custom' + i + 'Array']);
                if (prop)
                    vm.coworker['Custom' + i] = prop.join(',');

                //Make sure boolean values are submitted as true
                if (ko.unwrap(vm.coworker['Custom' + i]) === 'True')
                    vm.coworker['Custom' + i]('true');
            }

            //Convert select tag array into a comma separated string
            vm.coworker.ProfileTags(vm.coworker.ProfileTagsArray().join(','));

            var data = {
                base64avatar: vm.coworker.Avatar,
                Coworker: vm.coworker,
                Team: vm.team,
                recaptcha: $('#g-recaptcha-response').val()
            };

            var jsData = ko.mapping.toJS(data)
            //Tour Date
            if (vm.coworker.TourDate())
                jsData.Coworker.TourDate = moment(vm.coworker.TourDate()).format('YYYY-MM-DDT') + moment(vm.coworker.TourDate()).format('HH:mm') + 'Z';

            vm.busy(true);

            $.ajax({
                url: settings.url,
                type: 'POST',
                data: ko.mapping.toJSON(jsData),
                cache: false,
                contentType: "application/json",
            })
                .done(function (result) {
                    if (result.SuccessMessage)
                        app.showMessage(settings.successMessage || result.SuccessMessage);
                    else if (result.RedirectTo)
                        window.location = result.RedirectTo;
                    else
                        app.showErrorMessage(result.ErrorMessage || settings.errorMessage);

                    vm.busy(false);
                })
                .fail(function () {
                    app.showMessage(settings.errorMessage);
                    vm.busy(false);
                });

            return false;
        }
    }

    var vm = new SignupViewModel();

    vm.coworker.Email.subscribe(function (value) {
        $.get('/en/user/exists?email=' + value, function (result) {
            if (result) {
                vm.alreadyRegistered(true);
            }
            else {
                vm.alreadyRegistered(false);
            }
        })
    })

    self.init = function () {
        applyBindings();
    }

    function applyBindings() {
        //Valdidation
        ko.validation.init({
            registerExtenders: true,
            messagesOnModified: true,
            insertMessages: false,
            parseInputAttributes: true,
            decorateInputElement: true
        }, true);
        vm.errors = ko.validation.group(vm, { deep: true });
        vm.coworker.errors = ko.validation.group(vm.coworker, { deep: true });

        ko.applyBindings(vm);
    }
}

/**
 * Manages the UI of the ticket purchase process
 */
function TicketManager(settings) {
    var self = this;
    var currentLang = settings.currentLang;
    var availableCredit = settings.availableCredit;
    var maxQuantity = settings.maxQuantity;
    var fullName = settings.fullName;
    var email = settings.email;
    var errorInForm = settings.errorInForm;
    var attendeeCache = [];
    var eventId = settings.eventId;
    var productId = settings.productId;

    for (var k = 0; k < maxQuantity * 100; k++) {
        attendeeCache.push({
            productId: ko.observable(),
            productName: ko.observable(),
            fullName: ko.observable(),
            email: ko.observable()
        });
    }

    var StoreViewModel = function () {

        var self = this;
        var doPurchaseEnabled = ko.observable(true);
        var products = ko.observableArray();
        var qtys = ko.observableArray();
        var attendees = ko.observableArray([]);


        var coworker = {
            fullName: ko.observable(),
            generalTermsAcceptedOnline: ko.observable(false),
            salutation: ko.observable(),
            email: ko.observable(),
            companyName: ko.observable(),
            password: ko.observable(),
            cityName: ko.observable(),
            postCode: ko.observable(),
            mobilePhone: ko.observable(),
            state: ko.observable(),
            address: ko.observable(),
            createUser: ko.observable(true),

            billingName: ko.observable(),
            billingAddress: ko.observable(),
            billingState: ko.observable(),
            billingCityName: ko.observable(),
            billingPostCode: ko.observable(),
            taxIDNumber: ko.observable(),
        }

        this.discountCode = ko.observable('');
        this.discountCodeInfo = ko.observable();
        this.attendees = attendees;
        this.coworker = coworker;
        this.products = products;
        this.qtys = qtys;
        this.doPurchaseEnabled = doPurchaseEnabled;
        this.availableCredit = ko.observable(availableCredit);
        this.formError = ko.observable();
        this.purchaseError = ko.observable();
        this.purchaseMessage = ko.observable();
        this.alreadyRegistered = ko.observable(false);
        this.canPurchase = ko.observable(email != '');

    };

    var vm = new StoreViewModel();

    vm.coworker.email.subscribe(function (value) {
        $.get('/en/user/exists?email=' + value, function (result) {
            if (result) {
                vm.alreadyRegistered(true);
                vm.formError("{% T You are already registered, please log in. %}");
                vm.canPurchase(false);
            }
            else {
                vm.formError(null);
                vm.alreadyRegistered(false);
                vm.canPurchase(vm.coworker.email() != '');
            }
        })
    })
    /**
     * Loads the tickets for this event
     */
    this.loadData = function () {
        $.when($.post('/' + currentLang + '/events/productsjson?eventId=' + eventId + '&productId=' + productId))
            .then(mapData)
            .then(applyBindings);


        function mapData(data) {
            vm.products = ko.mapping.fromJS(data.products);
            vm.qtys = ko.observableArray([1, 2, 3, 4, 5]);

            var ps = vm.products();
            for (var i = 0; i < ps.length; i++) {
                ps[i].qtys = ko.observableArray();
                var absoluteMax = ps[i].MaxTicketsPerAttendee() || maxQuantity || 10;
                var max = (ps[i].TicketsLeft() >= absoluteMax ? absoluteMax : ps[i].TicketsLeft());
                if (max > maxQuantity)
                    max = maxQuantity;

                for (var j = 1; j <= max; j++) {
                    ps[i].qtys.push(j);
                }

            }


            vm.totalOneOff = ko.computed(function () {
                var ps = vm.products();
                var total = 0;
                for (var i = 0; i < ps.length; i++) {
                    if (ps[i].Quantity())
                        total = total + (ps[i].Price() * parseInt(ps[i].Quantity()));
                }

                total = total - availableCredit;
                if (total < 0) total = 0;
                return total.toFixed(2);
            }, this);

            vm.selectedProducts = ko.computed(function () {
                return ko.utils.arrayFilter(vm.products(), function (item) {
                    return item.Quantity() > 0;
                });
            }, this);

            vm.validateRegistration = function () {
                vm.formError(null);
                vm.purchaseError(null);
                vm.purchaseMessage(null);
                vm.canPurchase(false);

                if (vm.coworker.errors().length > 0) {
                    vm.coworker.errors.showAllMessages();
                    vm.formError('Please complete or correct the registration form');
                    return;
                }

                location.hash = '';
                location.hash = '#purchase';
                vm.canPurchase(true);
                return true;
            };

            vm.doPurchase = function () {

                vm.purchaseError(null);
                if (ko.validatedObservable) {
                    var validatedvm = ko.validatedObservable(vm);
                    if (validatedvm.isValid() === false) {
                        vm.errors.showAllMessages(true);
                        app.showErrorMessage(errorInForm);
                        return;
                    }
                }

                if (!vm.doPurchaseEnabled()) return;
                vm.doPurchaseEnabled(false);

                var plainJs = {
                    discountCode: vm.discountCode(),
                    redirectUrl: '/' + currentLang + '/events/payment',
                    products: ko.toJS(vm.selectedProducts),
                    coworker: ko.toJS(vm.coworker),
                    attendees: ko.toJS(vm.attendees)
                };
                $.when(sendData(plainJs))
                    .then(processPurchaseResult);

                function sendData(d) {
                    return $.ajax({
                        type: "POST",
                        url: '/' + currentLang + '/events/purchase',
                        contentType: "application/json",
                        dataType: "json",
                        data: JSON.stringify(d)
                    });
                }

                function processPurchaseResult(result) {
                    if (result.WasSuccessful) {
                        if (result.Redirect)
                            window.location = result.Redirect;
                        else
                            vm.purchaseMessage(result.Message);
                    } else {
                        vm.doPurchaseEnabled(true);
                        vm.purchaseError(result.Message);
                    }
                }
            };

        }

        function applyBindings() {

            //Valdidation
            ko.validation.init({
                registerExtenders: true,
                messagesOnModified: true,
                insertMessages: false,
                parseInputAttributes: true,
                decorateInputElement: true
            }, true);

            vm.errors = ko.validation.group(vm, { deep: true });
            vm.coworker.errors = ko.validation.group(vm.coworker, { deep: true });

            ko.applyBindings(vm);

            vm.selectedProducts.subscribe(function () {
                vm.attendees.removeAll();


                for (var i = 0; i < vm.selectedProducts().length; i++) {
                    for (var j = 0; j < vm.selectedProducts()[i].Quantity(); j++) {

                        var c = attendeeCache[(i * 10) + j];

                        c.productId(vm.selectedProducts()[i].Id());
                        c.productName(vm.selectedProducts()[i].Name());

                        if (c.fullName() == null) {
                            c.fullName(vm.coworker.fullName() || fullName);
                            c.email(vm.coworker.email() || email);
                        }
                        vm.attendees.push(c);
                    }
                }

                return vm.attendees;
            });
        }
    }

    function updateProductPrices() {
        $.when($.post('/' + currentLang + '/events/productsjson?discountCode=' + vm.discountCode() + '&eventId=' + eventId + '&productId=' + productId))
            .then(mapData);

        function mapData(data) {
            vm.discountCodeInfo(data.discountCode);
            var ps = vm.products();
            for (var i = 0; i < ps.length; i++) {
                var foundProduct = _.find(data.products, { Id: ps[i].Id() });
                ps[i].Price(foundProduct.Price)
                ps[i].PriceFormatted(foundProduct.PriceFormatted)
            }
        }
    }

    var updatedPricesDb = _.debounce(updateProductPrices, 1000);
    vm.discountCode.subscribe(updatedPricesDb);
}

/**
 * Manages the product purchase process 
 */
function StoreManager(settings) {
    var self = this;
    var currentLang = settings.lang || 'en';
    var purchased = false;

    var StoreViewModel = function () {

        var self = this;
        var doPurchaseEnabled = ko.observable(true);
        var products = ko.observableArray();
        var qtys = ko.observableArray();

        this.discountCode = ko.observable('');
        this.discountCodeInfo = ko.observable();
        this.products = products;
        this.qtys = qtys;
        this.doPurchaseEnabled = doPurchaseEnabled;
    };

    var vm = new StoreViewModel();

    function updateProductPrices() {
        $.when($.post('/' + currentLang + '/store/productsjson?businessGuid=' + settings.businessGuid + '&discountCode=' + vm.discountCode() + '&onlyTimePasses=' + settings.onlyTimePasses + '&productId=' + settings.productId + '&tag=' + settings.tag))
            .then(mapData);

        function mapData(data) {
            vm.discountCodeInfo(data.discountCode);
            var ps = vm.products();
            for (var i = 0; i < ps.length; i++) {
                var foundProduct = _.find(data.products, { Id: ps[i].Id() });
                ps[i].Price(foundProduct.Price)
                ps[i].PriceFormatted(foundProduct.PriceFormatted)
            }
        }
    }

    function loadData() {

        $.when($.post('/' + currentLang + '/store/productsjson?businessGuid=' + settings.businessGuid + '&discountCode=' + vm.discountCode() + '&onlyTimePasses=' + settings.onlyTimePasses + '&productId=' + settings.productId + '&tag=' + settings.tag))
            .then(mapData)
            .then(applyBindings);


        function mapData(data) {

            vm.products = ko.mapping.fromJS(data.products);
            vm.qtys = ko.observableArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

            var ps = vm.products();
            for (var i = 0; i < ps.length; i++) {
                ps[i].RegularCharge(ps[i].AlwaysRecurrent());
                ps[i].AlwaysOneOff(!settings.isMember || ps[i].AlwaysOneOff());
            }


            vm.totalTariff = ko.computed(function () {
                var ps = vm.products();
                var total = 0;
                for (var i = 0; i < ps.length; i++) {
                    if (ps[i].RegularCharge() && ps[i].Quantity())
                        total = total + (ps[i].Price() * parseInt(ps[i].Quantity()));
                }

                return total.toFixed(2);
            }, this);

            vm.totalOneOff = ko.computed(function () {
                var ps = vm.products();
                var total = 0;
                for (var i = 0; i < ps.length; i++) {
                    if (!ps[i].RegularCharge() && ps[i].Quantity())
                        total = total + (ps[i].Price() * parseInt(ps[i].Quantity()));
                }

                return total.toFixed(2);
            }, this);

            vm.selectedProducts = ko.computed(function () {
                return ko.utils.arrayFilter(vm.products(), function (item) {
                    return item.Quantity() > 0;
                });
            }, this);

            vm.showConfirmation = ko.observable(false);
            vm.confirmPurchase = function () {
                vm.doPurchase();
            };
            vm.doPurchase = function () {
                if (!vm.doPurchaseEnabled()) return;
                vm.doPurchaseEnabled(false);

                var plainJs = {
                    redirectUrl: settings.redirectUrl,
                    discountCode: vm.discountCode(),
                    businessGuid: settings.businessGuid,
                    products: ko.toJS(vm.selectedProducts)
                };
                $.when(sendData(plainJs))
                    .then(processPurchaseResult);

                function sendData(d) {
                    return $.ajax({
                        type: "POST",
                        url: '/' + currentLang + '/store/purchase',
                        contentType: "application/json",
                        dataType: "json",
                        data: JSON.stringify(d)
                    });
                }

                function processPurchaseResult(result) {
                    if (result.WasSuccessful) {
                        if (result.Redirect)
                            window.location = result.Redirect;
                        else
                            window.location = '/' + currentLang + '/allowances';
                    } else {
                        vm.doPurchaseEnabled(true);
                        app.showErrorMessage(result.Message);
                    }
                }
            };
            vm.closeConfirmation = function () {
                vm.showConfirmation(false);
            };
        }

        function applyBindings() {
            ko.applyBindings(vm);
        }
    }


    this.loadData = function () {
        loadData(vm);
    }


    var updatedPricesDb = _.debounce(updateProductPrices, 1000)
    vm.discountCode.subscribe(updatedPricesDb);
}


/**
 * Booking Manager
 */
function BookingManager(settings) {
    var bm = this;

    //Private fields
    var resources = settings.resources;
    var coworker = settings.coworker;
    var guestBookings = settings.guestBookings;
    var loginUrl = settings.loginUrl;
    var availableUrl = settings.availableUrl;
    var dayAvailableUrl = settings.dayAvailableUrl;
    var productsUrl = settings.productsUrl;
    var visitorsUrl = settings.visitorsUrl;
    var newBookingUrl = settings.newBookingUrl;
    var updateBookingUrl = settings.updateBookingUrl;
    var deleteBookingUrl = settings.deleteBookingUrl;
    var bookingUrl = settings.bookingUrl;
    var round = settings.roundMinutesTo;
    var dateTimeFormat = settings.dateTimeFormat;

    //Default date
    var start = roundDate(new Date(), round).toDate();
    var end = moment(start).add(1, 'hour').toDate();

    //View model definition
    var ViewModel = function () {
        this.datePickerOptions = {
            today: '',
            clear: '',
            selectYears: true,
            selectMonths: true,
            close: "{% T Close %}",
            format: 'dddd, dd mmmm yyyy'
        };
        this.timePickerOptions = {
            today: '',
            clear: '',
            close: "{% T Close %}",
        };
        this.currentBookingId = ko.observable(0);
        this.bookingFormInfo = ko.observable();
        this.bookingFormError = ko.observable();
        this.formError = ko.observable();
        this.selectedResource = ko.observable();
        this.resourceDetails = ko.observable({});
        this.selectedShift = ko.observable();
        this.resources = ko.observableArray(resources);
        this.startDate = ko.observable(start);
        this.endDate = ko.observable(end);
        this.startTime = ko.observable(start);
        this.endTime = ko.observable(end);
        this.price = ko.observable(0);
        this.bookingProducts = ko.observableArray();
        this.bookingVisitors = ko.observableArray();
        this.productQty = ko.observableArray(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
        this.noteFieldDisplayed = ko.observable(false);
        this.discountFieldDisplayed = ko.observable(false);
        this.notes = ko.observable();
        this.discountCode = ko.observable();
        this.disableSaveButton = ko.observable(false);
        this.tentative = ko.observable(false);
        this.discountInformation = ko.observable();
        this.disabledTimes = ko.observableArray([]);
        this.coworker = {
            FullName: ko.observable(),
            Email: ko.observable(),
            MobilePhone: ko.observable(),
            Address: ko.observable(),
            PostCode: ko.observable(),
            CityName: ko.observable(),
            State: ko.observable(),
            TaxIDNumber: ko.observable(),
            BillingEmail: ko.observable(),
            BillingName: ko.observable(),
            GeneralTermsAcceptedOnline: ko.observable(false),
            CurrentBalance: ko.observable(0),
            CurrentBalanceFormatted: ko.observable()
        };

        /**
         * Triggers the validation of the registration form
         */
        this.validateRegistration = function () {
            vm.formError(null);
            if (vm.coworker.errors().length > 0) {
                vm.coworker.errors.showAllMessages();
                vm.formError('Please complete or correct the registration form');
                return;
            }

            vm.closeRegistationForm();
            bm.showNewBookingForm();
        }

        /**
         * Shows/Hides the notes field
         */
        this.toggleNoteField = function () {
            vm.noteFieldDisplayed(!vm.noteFieldDisplayed());
        }

        /**
         * Shows/hides the discount code field
         */
        this.toggleDiscountField = function () {
            vm.discountFieldDisplayed(!vm.discountFieldDisplayed());
        }

        /**
         * Triggers when any of the products linked with the selected resource is selected by the user
         */
        this.productChanged = function () {
            bm.getBookingPrice();
        }

        /**
         * Updates the currently selected resource when one is selected in the dropdown menu
         */
        this.selectResource = function (resourceId) {
            var resource = _.find(resources, { id: resourceId });
            vm.selectedResource(resource);
        }

        /**
         * Hides the registration form
         */
        this.closeRegistationForm = function () {
            vm.formError(null);
            $('#bookings-registration-form').modal('hide');
        }

        /**
         * Hides the booking form
         */
        this.closeBookingForm = function () {
            vm.bookingFormError(null);
            vm.resourceDetails({});
            $('#bookings-booking-form').modal('hide');
        }

        /**
         * Saves the currently loaded booking. Passes the call down to an internal function of this service
         */
        this.saveBooking = function () {
            bm.saveBooking();
        }

        /**
         * Deletes the currently loaded booking. Passes the call down to an internal function of this service
         */
        this.deleteBooking = function () {
            bm.deleteBooking();
        }

        /**
         * A computed property showing the duration of the booking
         */
        this.duration = function () {
            return moment.duration(moment(vm.endTime()).diff(vm.startTime()));
        }

        this.addVisitor = function () {
            vm.bookingVisitors.push({
                Id: null,
                Email: null,
                FullName: null
            });
        }

        this.removeVisitor = function (visitor) {
            vm.bookingVisitors.remove(visitor);
        }
        this.clearVisitors = function () {
            vm.bookingVisitors([]);
        }

        //search rooms
        this.searchResources = function () {
            var start = moment(vm.startTime()).format('YYYY-MM-DDT') + moment(vm.startTime()).format('HH:mm') + 'Z';
            var end = moment(vm.endTime()).format('YYYY-MM-DDT') + moment(vm.endTime()).format('HH:mm') + 'Z';
            window.location = settings.searchUrl + '?start=' + start + '&end=' + end;
        }



    }

    //Instantiate the view model
    var vm = new ViewModel();

    //Handlers

    var handlersInit = false;
    function initHandlers() {
        if (handlersInit) return;
        handlersInit = true;

        vm.discountCode.subscribe(function (newDiscountCode) {
            bm.getBookingPrice();
        })

        var lastStartTime = vm.startTime();
        vm.startTime.subscribe(function (newStartTime) {

            //round the date
            var start = roundDate(newStartTime, round).toDate();
            if (start.getTime() != newStartTime.getTime()) {
                vm.startTime(start);
                lastStartTime = vm.startTime();
                return;
            }

            var minutesDiff = moment(lastEndTime).diff(lastStartTime, 'minutes');
            vm.endTime(moment(newStartTime).add(minutesDiff, 'minutes').toDate());

            lastStartTime = vm.startTime();
            bm.getBookingPrice();

            if (settings.onDateChange)
                settings.onDateChange(vm);
        });

        vm.startDate.subscribe(function (newStartDate) {
            vm.startTime(moment(vm.startTime()).clone().date(moment(newStartDate).date()).toDate());
            vm.startTime(moment(vm.startTime()).clone().month(moment(newStartDate).month()).toDate());
            vm.startTime(moment(vm.startTime()).clone().year(moment(newStartDate).year()).toDate());
            //bm.dayAvailbility();
        });

        vm.endDate.subscribe(function (newEndDate) {
            if (newEndDate.getDate() != vm.endTime().getDate()) {
                vm.endTime(newEndDate);
                //bm.dayAvailbility();
            }
        });

        var lastEndTime = vm.endTime();
        vm.endTime.subscribe(function (newEndTime) {
            //round the date
            var end = roundDate(newEndTime, round).toDate();
            vm.endDate(end);

            if (end.getTime() != newEndTime.getTime()) {
                vm.endTime(end);
                lastEndTime = vm.endTime();
                return;
            }

            //Make sure the end time is never earlier than the start date
            if (newEndTime <= vm.startTime()) {
                vm.startTime(moment(newEndTime).add(-1, 'hour').toDate());
            }

            lastEndTime = vm.endTime();
            bm.getBookingPrice();

            if (settings.onDateChange)
                settings.onDateChange(vm);
        })

        vm.selectedShift.subscribe(function (newShift) {
            if (!newShift) return;
            var datePart = moment(vm.startDate()).format('YYYY-MM-DD');
            var shiftStart = moment(datePart + ' ' + newShift.Start);
            var shiftEnd = moment(datePart + ' ' + newShift.End);

            //Check if shift is across midnight
            if (shiftStart > shiftEnd)
                shiftEnd.set('day', shiftEnd.get('day') + 1);

            vm.startDate(shiftStart.toDate());
            vm.endDate(shiftEnd.toDate());
            vm.startTime(shiftStart.toDate());
            vm.endTime(shiftEnd.toDate());
        })

        vm.selectedResource.subscribe(function () {
            bm.getBookingPrice();
            bm.getBookingProducts();
            //bm.dayAvailbility();
        })

        if (settings.onDateChange)
            settings.onDateChange(vm);

    }

    //Methods
    this.getBalance = function () {
        $.ajax({
            url: '/en/invoices',
            success: function (data) {
                vm.coworker.CurrentBalance(data.CurrentBalance);
                vm.coworker.CurrentBalanceFormatted(data.CurrentBalanceFormatted);
            },
            contentType: "application/json",
        });
    }

    this.applyBindings = function () {
        ko.validation.init({
            registerExtenders: true,
            messagesOnModified: true,
            insertMessages: false,
            parseInputAttributes: true,
            decorateInputElement: true
        }, true);
        vm.errors = ko.validation.group(vm, { deep: true });
        vm.coworker.errors = ko.validation.group(vm.coworker, { deep: true });
        ko.applyBindings(vm);

        initHandlers();
    }

    this.setDates = function (startDate, endDate) {
        vm.startDate(startDate);
        vm.endDate(endDate);
        vm.startTime(startDate);
        vm.endTime(endDate);
    }

    /**
     * Displays the booking form
     */
    this.showNewBookingForm = function () {

        bm.getBookingPrice();
        bm.getBookingProducts();
        $('#bookings-booking-form').modal({ backdrop: 'static' });
    }

    /**
     * Displays the registration form 
     */
    this.showRegistrationForm = function () {
        $('#bookings-registration-form').modal({ backdrop: 'static' });
    }

    /**
     * Starts the workflow to create a new booking asking the user to register or opening the new booking form.
     */
    this.createBooking = function (settings) {
        //Extract settings
        settings = settings || {};
        var resourceId = settings.resourceId;

        //Set the form in new booking mode 
        vm.currentBookingId(0);
        vm.clearVisitors();

        //Get the date with not time-zone. Full calendar sends this in the client timezone.
        var date = settings.date ? new Date(moment(settings.date).format('YYYY-MM-DDTHH:mmZ')) : new Date();
        var endDate = settings.endDate ? new Date(moment(settings.endDate).format('YYYY-MM-DDTHH:mmZ')) : moment(date).add(1, 'hour').toDate();

        vm.startDate(date);
        vm.endDate(endDate);
        vm.startTime(date);
        vm.endTime(endDate);

        //Preselect a room
        if (resourceId)
            vm.selectResource(parseInt(resourceId));

        //Login prompt
        if (coworker.Id == null && !guestBookings) {
            app.showQuestion(
                "{% T Sign in to make a booking %}",
                "{% T You must have an account with {0} to make a booking. Would you like to sign in now? || data.Business.Name %}")
                .then(function (result) {
                    if (result)
                        window.location = loginUrl;
                })


            return;
        }

        //Register prompt
        if (coworker.Id == null && guestBookings) {
            app.showQuestion(
                "{% T Are you already registered or have used any services at {0}? || {{ data.Business.Name }} %}",
                "{% T You can make bookings much quicker if you log in with the account details you were sent when you registered on the site or made your last booking. %}")
                .then(function (result) {
                    if (!result) {
                        bm.showRegistrationForm();
                    }
                    else {
                        window.location = loginUrl;
                    }
                });

            return;
        }


        //New booking form
        if (coworker != null) {
            bm.showNewBookingForm();
            return;
        }
    };

    /**
     * Retrieves the products associated with the selected booking
     */
    this.getBookingProducts = _.debounce(function () {
        if (vm.selectedResource() == null) return;

        var data = {
            bookingId: vm.currentBookingId(),
            resourceId: vm.selectedResource().id
        }
        $.post(productsUrl, data).then(function (result) {
            vm.bookingProducts(result);
        });
    }, 500);

    /**
     * Retrieves the visitor associated with the selected booking
     */
    this.getBookingVisitors = _.debounce(function () {
        if (vm.selectedResource() == null) return;
        var data = {
            bookingId: vm.currentBookingId()
        }
        $.post(visitorsUrl, data).then(function (result) {
            vm.bookingVisitors(result);
        });
    }, 500);

    this.dayAvailbility = function () {
        var resource = vm.selectedResource();
        if (!resource) return;
        console.log('resource', resource)
        var startDay = moment(vm.startDate()).startOf('day').format('YYYY-MM-DD');
        $.post(dayAvailableUrl + '?guid=' + resource.UniqueId + '&startTime=' + startDay + '&bookingId=' + vm.currentBookingId())
            .then(function (result) {
                var disableItems = _.map(result.AvailableSlots, function (item, index) {
                    var fromHour = parseInt(item.Time.split(':')[0]);
                    var fromMinutes = parseInt(item.Time.split(':')[1]);
                    var nextItem = index < result.AvailableSlots.length ? result.AvailableSlots[index + 1] : null;
                    if (!item.Available || item.Booked && (nextItem == null || !nextItem.Available || nextItem.Booked))
                        return { from: [fromHour, fromMinutes], to: [fromMinutes == 0 ? fromHour : fromHour + 1, fromMinutes == 0 ? 30 : 00] }
                    else
                        return {}
                })
                console.log('disableItems', disableItems)
                //vm.disabledTimes(disableItems)
            });
    }

    /**
     * Gets the price of this booking based on the selected resource, products and start and end times.
     */
    this.getBookingPrice = _.debounce(function () {
        vm.bookingFormInfo("{% T We are checking if this resource is available, please wait... %}")
        vm.bookingFormError(null);
        vm.price(null);


        if (vm.selectedResource() == null) {
            vm.discountInformation(null);
            vm.bookingFormError(null);
            vm.bookingFormInfo(null);
            return null;
        }

        var data = getBookingData();

        $.post(availableUrl, data)
            .then(function (result) {
                var newShifts = false;
                if ((vm.resourceDetails().Shifts == null || vm.resourceDetails().Shifts.length == 0) && result.Resource.Shifts.length > 0)
                    newShifts = true;

                //Update booking form details if it is visible
                var modalIsVisible = $('#bookings-booking-form').hasClass('in');
                if (modalIsVisible) {
                    if (vm.resourceDetails().Id != result.Resource.Id) {
                        vm.resourceDetails(result.Resource);
                        if (newShifts) return;
                    }

                    vm.price(result.Price);
                    vm.discountInformation(result.discountCode);
                    vm.bookingFormError(result.Message);
                    vm.bookingFormInfo(null);
                }
            });
    }, 1000);

    /**
     * Makes the HTTP request to update and existing booking or create a new booking
     */
    this.saveBooking = function () {
        //Set UI state while saving the booking
        vm.disableSaveButton(true);
        vm.bookingFormError(null);

        //Get the URL to create or save the booking.
        var url = vm.currentBookingId() > 0 ? updateBookingUrl : newBookingUrl;

        //Build request data and do request to create/update booking
        var data = getBookingData();
        $.ajax(url, {
            data: JSON.stringify(data),
            contentType: 'application/json',
            type: 'POST'
        }).
            then(function (result) {
                if (result.WasSuccessful) {
                    vm.disableSaveButton(false);
                    vm.closeBookingForm();
                    if (result.Value && result.Value.CancelUnpaidInvoices) {
                        app.showQuestion(
                            "{% T Payment Required %}",
                            "{% T One or more bookings need payment before they are confirmed. Would you like to pay these now? %}")
                            .then(function (result) {
                                if (result)
                                    window.location = settings.paymentUrl;
                                else
                                    $('#calendar').fullCalendar('refetchEvents')
                            })
                    } else {
                        app.showMessage(result.Message).
                            then(function (result) {
                                $('#calendar').fullCalendar('refetchEvents')
                            });
                    }
                }
                else {
                    vm.disableSaveButton(false);
                    vm.bookingFormInfo(null);
                    vm.bookingFormError(result.Message);
                }
            }).
            fail(function () {
                vm.disableSaveButton(false);
                vm.bookingFormInfo(null);
                vm.bookingFormError("{% T Opps! We could not save this booking, please try again. %}");
            });
    }

    /**
     * Deletes the currently loaded booking.
     */
    this.deleteBooking = function () {
        vm.closeBookingForm();
        app.showQuestion("{% T Would you like to cancel this booking? %}")
            .then(function (answer) {
                if (answer) {
                    var url = deleteBookingUrl + '/' + vm.currentBookingId();
                    $.post(url).
                        then(function (result) {
                            if (result.WasSuccessful) {
                                vm.closeBookingForm();
                                app.showMessage(result.Message).
                                    then(function () {
                                        vm.disableSaveButton(false);
                                        $('#calendar').fullCalendar('refetchEvents')
                                    });
                            }
                            else {
                                vm.bookingFormInfo(null);
                                vm.bookingFormError(result.Message);
                                bm.showNewBookingForm();
                                vm.disableSaveButton(false);
                            }
                        }).
                        fail(function () {
                            bm.showNewBookingForm();
                            vm.bookingFormError("{% T We could not delete this booking, please try again. %}");
                        });
                }
                else {
                    bm.showNewBookingForm();
                }
            });
    }

    /**
     * Loads the details of an existing booking.
     */
    this.showBooking = function (calEvent) {
        vm.currentBookingId(calEvent.id);
        $.get(bookingUrl + '/' + vm.currentBookingId()).then(function (response) {
            initHandlers();
            vm.disableSaveButton(false);
            vm.selectedResource(_.find(resources, { id: response.Value.ResourceId }));
            vm.resourceDetails(response.Resource);
            vm.startDate(moment(response.Value.FromTime.replace("Z", "")).toDate());
            vm.endDate(moment(response.Value.ToTime.replace("Z", "")).toDate());
            vm.startTime(moment(response.Value.FromTime.replace("Z", "")).toDate());
            vm.endTime(moment(response.Value.ToTime.replace("Z", "")).toDate());
            vm.notes(response.Value.Notes);
            selectShift(response.Value);
            bm.getBookingVisitors();
            bm.showNewBookingForm();
        });
    }

    //Utils functions

    var selectShift = function (booking) {
        var foundShift = _.find(vm.resourceDetails().Shifts, function (shift) {
            var shiftStart = moment('2000-01-01 ' + shift.Start);
            var shiftEnd = moment('2000-01-01 ' + shift.End);
            var selectedStart = moment.utc(booking.FromTime);
            var selectedEnd = moment.utc(booking.ToTime);

            if (shiftStart.get('hour') == selectedStart.get('hour') &&
                shiftStart.get('minute') == selectedStart.get('minute') &&
                shiftEnd.get('hour') == selectedEnd.get('hour') &&
                shiftEnd.get('minute') == selectedEnd.get('minute'))
                return true;

            return false;
        });

        if (foundShift != null && vm.selectedShift().Name != foundShift.Name)
            vm.selectedShift(foundShift);
    };

    /**
     * Builds an object with the data of the booking as selected in the booking form
     */
    function getBookingData() {
        return {
            Booking: {
                Notes: vm.notes(),
                DiscountCode: vm.discountCode(),
                Resource: {
                    Id: vm.selectedResource().id
                },
                Tentative: vm.tentative(),
                Id: vm.currentBookingId(),
                FromTime: moment(vm.startDate()).format('YYYY-MM-DDT') + moment(vm.startTime()).format('HH:mm') + 'Z',
                ToTime: moment(vm.endDate()).format('YYYY-MM-DDT') + moment(vm.endTime()).format('HH:mm') + 'Z',
                BookingVisitors: _.map(vm.bookingVisitors(), function (x) {
                    return {
                        Id: x.Id,
                        Visitor: {
                            FullName: x.FullName,
                            Email: x.Email
                        }

                    }
                })
            },
            Coworker: ko.toJS(vm.coworker),
            Products: _.map(vm.bookingProducts(), function (x) {
                return {
                    ProductId: x.ProductId,
                    Quantity: x.Quantity,
                    Selected: x.Selected
                }
            }),
        };
    }

    /**
     * Rounds a date to the nearest "roundTo" minutes
     */
    function roundDate(date, roundTo) {
        var start = moment(date);
        start.millisecond(0);
        start.second(0);
        var remainder = (roundTo - start.minute()) % roundTo;
        return moment(start).add("minutes", remainder);
    }
}



/**
 * Directory Manager
 */

function DirectoryManager(baseUrl) {
    var self = this;
    var baseUrl = baseUrl;

    self.init = function () {

        $('.custom-filter-link, .tag-filter-link').click(function () {
            var cb = $(this);

            //Deselect all other filters in this category
            var index = cb.attr('data-cmindex');
            $('.custom-filter-link[data-cmindex=' + index + ']').not(cb).attr('data-selected', 'false');

            //Toggle clicked filter and any other link for the same filter
            cb.attr('data-selected', cb.attr('data-selected') == 'true' ? 'false' : 'true');
            $('.tag-filter-link[data-tag="' + cb.attr('data-tag') + '"]').not(cb).attr('data-selected', cb.attr('data-selected'));

            //Trigger search
            self.doSearch();
            return false;
        });
    }



    self.doSearch = function () {
        //tags
        var url = baseUrl;
        var tags = '';
        var customs = '';
        $('.tag-filter-link').each(function (k, el) {
            var cb = $(el);
            if (cb.attr('data-selected') == "true" && cb.attr('data-tag') != null)
                tags = tags.replace(cb.attr('data-tag').toLowerCase() + ',', '') + cb.attr('data-tag').toLowerCase() + ',';
        });


        tags = tags.substring(0, tags.length - 1);

        //custom fields
        $('.custom-filter-link').each(function (k, el) {
            var cb = $(el);
            if (cb.attr('data-selected') == "true" && cb.attr('data-value') != null)
                customs = customs + 'Custom' + cb.attr('data-cmindex') + '=' + cb.attr('data-value') + '&';
        });

        //Search
        var query = ($('#query').val() + '').trim();
        var location = url + '?' + (tags ? 'tag=' + tags + '&' : '') + (customs ? customs : '') + (query ? '&query=' + query + '&' : '');
        location = location.substring(0, location.length - 1);
        window.location = location;

        return false;
    }

}

/** 
 * Provides basic validation and submition functions for HTML forms.
 */
function SimpleFormManager(settings) {
    var self = this;
    var viewModel = function () {
        var vm = this;
        vm.busy = ko.observable(false);
        vm.formData = ko.mapping.fromJS(settings.formData);

        vm.submitForm = function () {
            if (ko.validatedObservable) {
                var validatedvm = ko.validatedObservable(vm.formData);
                if (validatedvm.isValid() === false) {
                    vm.errors.showAllMessages(true);
                    app.showErrorMessage(settings.formError);
                    return false;
                }
            }

            vm.busy(true);
            return true;
        }
    }

    var vm = new viewModel();

    self.init = function () {

        ko.validation.init({
            registerExtenders: true,
            messagesOnModified: true,
            insertMessages: false,
            parseInputAttributes: true,
            decorateInputElement: true
        }, true);

        vm.errors = ko.validation.group(vm, { deep: true });
        ko.applyBindings(vm, document.getElementById(settings.formId));
    }

}

/**
 * Profile Manager
 */

function ProfileManager(settings) {
    var self = this;
    var navManager = new LateralNavigationManager();

    var ViewModel = function () {
        var vm = this;

        var hasBilllingDetails = settings.coworker.BillingAddress ||
            settings.coworker.BillingPostCode ||
            settings.coworker.BillingCityName ||
            settings.coworker.BillingState ||
            settings.coworker.BillingEmail;

        settings.coworker.UpdateBillingDetails = false;
        settings.coworker.Avatar = null;
        settings.coworker.Banner = null;
        settings.coworker.hasBillingDetails = hasBilllingDetails;
        settings.coworker.ProfileTagsArray = settings.coworker.ProfileTags != null ? (settings.coworker.ProfileTags + '').split(',') : [];
        settings.user.OldPassword = null;
        settings.user.NewPassword = null;
        settings.user.RepeatNewPassword = null;

        //Build custom field helpers
        _.forEach(settings.customFields, function (field) {
            if (field.AvailableOptions)
                field.AvailableOptionsArray = field.AvailableOptions.split(',');

            if (field.FieldType === 'Dropdown') {
                if (settings.coworker['Custom' + field.CustomFieldIndex])
                    settings.coworker['Custom' + field.CustomFieldIndex + 'Array'] = settings.coworker['Custom' + field.CustomFieldIndex].split(',');
                else
                    settings.coworker['Custom' + field.CustomFieldIndex + 'Array'] = [];
            }
        });


        this.coworker = ko.mapping.fromJS(settings.coworker);
        this.user = ko.mapping.fromJS(settings.user);
        this.profileTags = ko.mapping.fromJS(settings.profileTags);
        this.customFields = _.toArray(_.groupBy(settings.customFields, 'GroupName'));
        this.busy = ko.observable(false);

        this.datePickerOptions = {
            today: '',
            selectYears: 200,
            clear: "{% T Clear %}",
            selectMonths: true,
            close: "{% T Close %}",
            format: 'dddd, dd mmmm yyyy'
        };


        vm.coworker.DateOfBirth = ko.observable(moment(vm.coworker.DateOfBirth()).toDate());
        vm.coworker.BillingName.subscribe(function (newvalue) {
            if (!vm.coworker.CompanyName()) vm.coworker.CompanyName(newvalue);
        })

        /**
         * POSTs the profile form
         */
        this.saveDetails = function () {

            if (ko.validatedObservable) {
                var validatedvm = ko.validatedObservable(vm.coworker);
                if (validatedvm.isValid() === false) {
                    vm.errors.showAllMessages(true);
                    app.showErrorMessage(settings.formError);
                    return;
                }
            }

            vm.busy(true);

            //Convert select tag array into a comma separated string
            vm.coworker.ProfileTags(vm.coworker.ProfileTagsArray().join(','));

            //Process values for custom fields 
            for (var i = 1; i <= 30; i++) {
                //Convert arrays into comma separated strings.
                var prop = ko.unwrap(vm.coworker['Custom' + i + 'Array']);
                if (prop)
                    vm.coworker['Custom' + i] = prop.join(',');

                //Make sure boolean values are submitted as true
                if (ko.unwrap(vm.coworker['Custom' + i]) === 'True')
                    vm.coworker['Custom' + i]('true');
            }

            if (!vm.coworker.hasBillingDetails()) {
                vm.coworker.UpdateBillingDetails = true;
                vm.coworker.BillingAddress = null;
                vm.coworker.BillingPostCode = null;
                vm.coworker.BillingCityName = null;
                vm.coworker.BillingState = null;
                vm.coworker.BillingPostCode = null;
                vm.coworker.BillingEmail = null;
            };

            var data = {
                base64avatar: vm.coworker.Avatar(),
                base64banner: vm.coworker.Banner(),
                Coworker: vm.coworker,
                User: vm.user
            };

            $.ajax({
                url: settings.url,
                type: 'POST',
                data: ko.mapping.toJSON(data),
                cache: false,
                contentType: "application/json",
            })
                .done(function (result) {
                    if (result.SuccessMessage)
                        app.showMessage(settings.successMessage || result.SuccessMessage)
                            .done(function () {
                                if (data.base64avatar || data.base64banner || data.Coworker.DeleteAvatar() || data.Coworker.DeleteBanner())
                                    location.reload(true);
                            });
                    else
                        app.showErrorMessage(result.ErrorMessage || settings.errorMessage);

                    vm.busy(false);
                })
                .fail(function () {
                    app.showMessage(settings.errorMessage);
                    vm.busy(false);
                });

            return false;
        }
    }

    var vm = new ViewModel();

    self.init = function () {

        vm.user.RepeatNewPassword.extend({ areSame: vm.user.NewPassword });
        ko.validation.init({
            registerExtenders: true,
            messagesOnModified: true,
            insertMessages: false,
            parseInputAttributes: true,
            decorateInputElement: true
        }, true);


        vm.errors = ko.validation.group(vm, { deep: true });
        ko.applyBindings(vm);
        navManager.initLateralSmoothNav();

        vm.coworker.FullName.subscribe(function () {
            vm.coworker.Salutation(vm.coworker.FullName().split(' ')[0]);
        })
    }
}


/**
 * Team Profile Manager
 */

function TeamProfileManager(settings) {
    var self = this;

    var ViewModel = function () {
        var vm = this;

        settings.team.TeamLogo = null;
        settings.team.Banner = null;
        settings.team.ProfileTagsArray = (settings.team.ProfileTags + '').split(',')

        this.coworker = { hasBillingDetails: false };
        this.team = ko.mapping.fromJS(settings.team);
        this.profileTags = ko.mapping.fromJS(settings.profileTags);
        this.busy = ko.observable(false);

        /**
         * POSTs the profile form
         */
        this.saveDetails = function () {

            if (ko.validatedObservable) {
                var validatedvm = ko.validatedObservable(vm.coworker);
                if (validatedvm.isValid() === false) {
                    vm.errors.showAllMessages(true);
                    app.showErrorMessage(settings.formError);
                    return;
                }
            }

            vm.busy(true);

            //Convert select tag array into a comma separated string
            vm.team.ProfileTags(vm.team.ProfileTagsArray().join(','));

            var data = {
                base64teamLogo: vm.team.TeamLogo(),
                Team: vm.team,
            };

            $.ajax({
                url: settings.url,
                type: 'POST',
                data: ko.mapping.toJSON(data),
                cache: false,
                contentType: "application/json",
            })
                .done(function (result) {
                    if (result.SuccessMessage)
                        app.showMessage(settings.successMessage || result.SuccessMessage)
                            .done(function () {
                                if (data.base64teamLogo)
                                    location.reload(true);
                            });
                    else
                        app.showErrorMessage(result.ErrorMessage || settings.errorMessage);

                    vm.busy(false);
                })
                .fail(function () {
                    app.showMessage(settings.errorMessage);
                    vm.busy(false);
                });

            return false;
        }
    }

    var vm = new ViewModel();

    self.init = function () {

        ko.validation.init({
            registerExtenders: true,
            messagesOnModified: true,
            insertMessages: false,
            parseInputAttributes: true,
            decorateInputElement: true
        }, true);


        vm.errors = ko.validation.group(vm, { deep: true });
        ko.applyBindings(vm);


    }
}

function LateralNavigationManager() {
    this.initLateralSmoothNav = function () {
        /**
         *  Lateral navigation
         */
        if ($('#js-nav-smooth').length > 0) {
            $(window).scroll(function () {
                highlightCurrentPosition();
            })

            $('#js-nav-smooth li.active a').on('click', function (e) {
                var id = $(this).attr('href').split('#').pop();
                app.scrollToAnchorElement(id);
                e.preventDefault();
            });
        }

        try {
                    highlightCurrentPosition();

        } catch (error){
            
        }


        function highlightCurrentPosition() {
            var safeHeaderHeight = $('.site-header').height() + $('.navbar-sec').height() + 73;
            $('#js-nav-smooth li li').removeClass('active');
            var top = $(window).scrollTop();
            var anchors = $('#js-nav-smooth a');
            for (var i = anchors.length - 1; i >= 0; i--) {
                var v = anchors[i];
                var href = $(v).attr('href');
                if (!href) continue;

                var id = href.split('#').pop(),
                    $div = $('#' + id);

                if ($div.length == 0) continue;
                if ($div.is(':visible') == false) continue;

                if (($div.offset().top - safeHeaderHeight - 100) <= top) {
                    $(v).parent().addClass('active');
                    return;
                }
            }
        }
    }
}

/** 
 * Community Board Manager
 */
function CommunityBoardManager(settings) {
    var self = this;
    var ViewModel = function () {
        this.Subject = ko.observable(),
            this.Message = ko.observable(),
            this.Tags = ko.observable()
    }

    var vm = new ViewModel();

    this.applyStartFormBindings = function () {
        ko.validation.init({
            registerExtenders: true,
            messagesOnModified: true,
            insertMessages: false,
            parseInputAttributes: true,
            decorateInputElement: true
        }, true);
        vm.errors = ko.validation.group(vm, { deep: true });
        ko.applyBindings(vm);
    }

    self.init = function () {
        $(".timeago").timeago();

        $('.btn-like-thread').on('click', function () {
            var tid = $(this).attr('data-thread');
            var state = $(this).attr('data-state');
            if (state == 1)
                unlikeThread(this, tid);
            else
                likeThread(this, tid);
            return false;
        });


        $('.btn-like-message').on('click', function () {
            var mid = $(this).attr('data-message');
            var state = $(this).attr('data-state');
            if (state == 1)
                unlikeMessage(this, mid);
            else
                likeMessage(this, mid);

            return false;
        });



        $('.btn-follow-thread').on('click', function () {
            var tid = $(this).attr('data-thread');
            var state = $(this).attr('data-state');
            if (state == 1)
                unfollowThread(this, tid);
            else
                followThread(this, tid);

            return false;
        });



        $('.btn-mute-thread').on('click', function () {
            var tid = $(this).attr('data-thread');
            var state = $(this).attr('data-state');

            if (state == 1)
                unmuteThread(this, tid);
            else
                muteThread(this, tid);

            return false;
        });

        $("#reply-box").mentionsInput({
            onDataRequest: function (mode, query, callback) {
                $.get('/en/directory/json?query=' + query, function (responseData) {
                    responseData = $.map(responseData, function (e, i) {
                        return {
                            id: e.Id,
                            name: e.FullName,
                            type: 'contact',
                            avatar: e.AvatarUrl + '?w=20&h=20&noavatar=%2Fcontent%2Fthemes%2Fpublic%2Fdos%2Fimg%2Favatar-default.png'
                        }
                    });
                    callback.call(this, responseData);
                });
            }
        });

        $("#reply-box").keyup(function () {
            $("#reply-box").mentionsInput('val', function (text) {
                $('#reply-box-server').val(text);
            });
        });

        $("form").submit(function () {
            $("#reply-box").mentionsInput('val', function (text) {
                $('#reply-box-server').val(text);
            });
        });

        $('.thread-expand').click(function () {
            $(this).hide();
            var threadId = $(this).attr('data-thread');
            $('#thread-summary-' + threadId).hide();
            $('#thread-complete-' + threadId).show();
            return false;
        })

        if ($('#tags').length) {
            $('#tags').tagsinput({
                trimValue: true,
                freeInput: true,
                maxTags: 3,
                maxChars: 15
            });
        }

        $('.bootstrap-tagsinput').addClass('form-control')
    }

    self.deleteThread = function (deleteUrl) {
        app.showQuestion("{% T Delete this thread? %}")
            .then(function (result) {
                if (result === true)
                    window.location = deleteUrl;
            });
        return false;
    }

    self.deleteMessage = function (deleteUrl) {
        app.showQuestion("{% T Delete this message? %}")
            .then(function (result) {
                if (result === true)
                    window.location = deleteUrl;
            });
        return false;
    }

    function likeThread(el, threadId) {
        $.post('/en/community/likeThread/' + threadId, function (data) {
            if (data.WasSuccessful) {
                if ($(el).find('span').length > 0)
                    $(el).find('span').text($(el).attr('data-off'));
                else
                    $(el).text($(el).attr('data-off'));
                $(el).attr('data-state', 1);
            }
            else $(el).text('Error!');
        });
    }

    function unlikeThread(el, threadId) {
        $.post('/en/community/unlikeThread/' + threadId, function (data) {
            if (data.WasSuccessful) {
                if ($(el).find('span').length > 0)
                    $(el).find('span').text($(el).attr('data-on'));
                else
                    $(el).text($(el).attr('data-on'));
                $(el).attr('data-state', 0);
            }
            else $(el).text('Error!');
        });
    }

    function likeMessage(el, messageId) {
        $.post('/en/community/likeMessage/' + messageId, function (data) {
            if (data.WasSuccessful) {
                if ($(el).find('span').length > 0)
                    $(el).find('span').text($(el).attr('data-off'));
                else
                    $(el).text($(el).attr('data-off'));
                $(el).attr('data-state', 1);
            }
            else $(el).text('Error!');
        });
    }

    function unlikeMessage(el, messageId) {
        $.post('/en/community/unlikeMessage/' + messageId, function (data) {
            if (data.WasSuccessful) {
                if ($(el).find('span').length > 0)
                    $(el).find('span').text($(el).attr('data-on'));
                else
                    $(el).text($(el).attr('data-on'));
                $(el).attr('data-state', 0);
            } else $(el).text('Error!');
        });
    }


    function followThread(el, threadId) {

        return $.post('/en/community/followThread/' + threadId, function (data) {
            if (data.WasSuccessful) {
                unmuteThread($('#mute-thread-' + threadId), threadId);
                $(el).text($(el).attr('data-off'));
                $(el).attr('data-state', 1);
                $('#follow-icon-thread-' + threadId).show();
            }
            else $(el).text('Error!');
        });
    }

    function unfollowThread(el, threadId) {
        return $.post('/en/community/unfollowThread/' + threadId, function (data) {
            if (data.WasSuccessful) {
                $(el).text($(el).attr('data-on'));
                $(el).attr('data-state', 0);
                $('#follow-icon-thread-' + threadId).hide();
            } else $(el).text('Error!');
        });
    }

    function muteThread(el, threadId) {

        return $.post('/en/community/muteThread/' + threadId, function (data) {
            if (data.WasSuccessful) {
                unfollowThread($('#follow-thread-' + threadId), threadId);
                $(el).text($(el).attr('data-off'));
                $(el).attr('data-state', 1);

                $(el).closest('.board-list__item').addClass('board-list__item--muted');

            }
            else $(el).text('Error!');
        });
    }

    function unmuteThread(el, threadId) {
        return $.post('/en/community/unmuteThread/' + threadId, function (data) {
            if (data.WasSuccessful) {
                $(el).text($(el).attr('data-on'));
                $(el).attr('data-state', 0);

                $(el).closest('.board-list__item').removeClass('board-list__item--muted');
            } else $(el).text('Error!');
        });
    }

}



/* KO Custom Bindings */
ko.bindingHandlers.pickadate = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {

        var valueUnwrapped = ko.unwrap(valueAccessor());
        var $input = $(element);

        //init date picker        
        $input.pickadate(valueUnwrapped.options);

        $input.pickadate('on', {
            open: function () {

            },
            set: function (thingSet) {
                if (thingSet.select)
                    ////Update the date  part of the selected date object by calculating minutes from midnight
                    var currentDate = moment(valueAccessor().value());
                if (!currentDate) return;
                // Your moment at midnight
                var mmtMidnight = currentDate.clone().startOf('day');
                // Difference in minutes
                var diffMinutes = currentDate.clone().diff(mmtMidnight, 'minutes');

                var newDate = moment(thingSet.select).startOf('day').add(diffMinutes, 'minutes');
                valueAccessor().value(newDate.toDate());
            }
        });
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var valueUnwrapped = ko.unwrap(valueAccessor());
        var date = valueUnwrapped.value()
        var $input = $(element);

        var mnt = moment(date);
        if(mnt.isValid())
        $input.pickadate('set', { select: mnt.toDate() });
        else
            $input.pickadate('set', { select: null });
        


    }
};

ko.bindingHandlers.pickatime = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var valueUnwrapped = ko.unwrap(valueAccessor());
        var $input = $(element);

        //init time picke
        var options = valueUnwrapped.options;
        if (valueUnwrapped.disabledTimes) options.disable = valueUnwrapped.disabledTimes();
        $input.pickatime(options);

        //Update the time part of the selected date object
        $input.pickatime('on', {
            open: function () {
                var pickerElement = $input.next();
                var top = pickerElement.find(".picker__list-item--selected").index();
                var height = pickerElement.find(".picker__list-item--selected").outerHeight();

                pickerElement.find('.picker__holder').animate({
                    scrollTop: top * height - height
                }, 1);
            },
            set: function (thingSet) {
                if (!isNaN(thingSet.select) && thingSet.select >= 0) {
                    var value = valueAccessor().value();
                    if (value) {
                        var currentDate = moment(value).startOf('day');
                        currentDate = currentDate.add(thingSet.select, 'minutes').toDate();

                        //If the date has changed, update the observable
                        if (valueAccessor().value() && valueAccessor().value().getTime() != currentDate.getTime())
                            valueAccessor().value(currentDate);
                    }
                    else {
                        valueAccessor().value(currentDate);
                    }
                }
            }
        });

    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var valueUnwrapped = ko.unwrap(valueAccessor());
        var date = valueUnwrapped.value()
        var options = valueUnwrapped.options;
        if (valueUnwrapped.disabledTimes) options.disable = valueUnwrapped.disabledTimes();

        var $input = $(element);
        ////Update the time part of the selected date object by calculating minutes from midnight
        var mmt = moment(date);
        // Your moment at midnight
        var mmtMidnight = mmt.clone().startOf('day');
        // Difference in minutes
        var diffMinutes = mmt.clone().diff(mmtMidnight, 'minutes');

        var selectedTime = $input.pickatime('get', 'select');
        if (selectedTime == null || diffMinutes != selectedTime.time) {
            $input.pickatime('set', { select: diffMinutes });


            var currentTime = $input.pickatime('get', 'select').time;
            var currentDate = mmtMidnight.isValid() ? mmtMidnight.startOf('day') : moment().startOf('day');
            valueAccessor().value(currentDate.add(currentTime, 'minutes').toDate());
        }

        $input.pickatime('set', { enable: true });
        if (options.disable) $input.pickatime('set', { disable: options.disable });

    }
};

ko.bindingHandlers.simplemde = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var valueUnwrapped = ko.unwrap(valueAccessor());
        var value = valueUnwrapped.value()
        var $input = $(element);
        var simplemde = new SimpleMDE({
            status: false,
            element: $input[0]
        });

        if (value)
            simplemde.value(value);

        simplemde.codemirror.on("change", function () {
            valueAccessor().value(simplemde.value());
        });
    }
};

ko.bindingHandlers.tagsinput = {
    init: function (element, valueAccessor, allBindings) {
        var defaultOptions = {
        }
        var options = allBindings().tagsinputOptions || defaultOptions;
        var value = valueAccessor();
        var valueUnwrapped = ko.unwrap(value);

        var el = $(element);

        el.tagsinput(options);

        for (var i = 0; i < valueUnwrapped.length; i++) {
            el.tagsinput('add', valueUnwrapped[i]);
        }

        el.on('itemAdded', function (event) {
            if (valueUnwrapped.indexOf(event.item) === -1) {
                value.push(event.item);
            }
        })

        el.on('itemRemoved', function (event) {
            value.remove(event.item);
        });
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var value = valueAccessor();
        var valueUnwrapped = ko.unwrap(value);

        var el = $(element);
        var prev = el.tagsinput('items');

        var added = valueUnwrapped.filter(function (i) { return prev.indexOf(i) === -1; });
        var removed = prev.filter(function (i) { return valueUnwrapped.indexOf(i) === -1; });

        // Remove tags no longer in bound model
        for (var i = 0; i < removed.length; i++) {
            el.tagsinput('remove', removed[i]);
        }

        // Refresh remaining tags
        el.tagsinput('refresh');

        // Add new items in model as tags
        for (i = 0; i < added.length; i++) {
            el.tagsinput('add', added[i]);
        }
    }
};

ko.bindingHandlers.chosen = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var $element = $(element);
        var options = ko.unwrap(valueAccessor());

        if (typeof options === 'object')
            $element.chosen(options);
        else
            $element.chosen();

        ['options', 'selectedOptions', 'value'].forEach(function (propName) {
            if (allBindings.has(propName)) {
                var prop = allBindings.get(propName);
                if (ko.isObservable(prop)) {
                    prop.subscribe(function () {
                        setTimeout(function () {
                            $element.trigger('chosen:updated');
                        }, 0);
                    });
                }

            }
        });
    },
    update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var $element = $(element);
        setTimeout(function () {
            $element.trigger('chosen:updated');
        }, 0);

    }
}

ko.bindingHandlers.booleanValue = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var observable = valueAccessor(),
            interceptor = ko.computed({
                read: function () {
                    return observable().toString();
                },
                write: function (newValue) {
                    observable(newValue === "true");
                }
            });

        ko.applyBindingsToNode(element, { value: interceptor });
    }
};

ko.partitioned = function (observableArray, count) {
    if (!observableArray) return [];
    var rows, partIdx, i, j, arr;

    arr = observableArray();
    if (!arr) return [];

    rows = [];
    for (i = 0, partIdx = 0; i < arr.length; i += count, partIdx += 1) {
        rows[partIdx] = [];
        for (j = 0; j < count; j += 1) {
            if (i + j >= arr.length) {
                break;
            }
            rows[partIdx].push(arr[i + j]);
        }
    }
    return rows;
};

ko.validation.rules['areSame'] = {
    getValue: function (o) {
        return (typeof o === 'function' ? o() : o);
    },
    validator: function (val, otherField) {
        return val === this.getValue(otherField);
    },
    message: "{% T The fields must have the same value %}"
};

//https://github.com/TooManyBees/knockoutjs-file-binding/blob/master/knockout-file-bind.js
ko.bindingHandlers['file'] = {
    init: function (element, valueAccessor, allBindings) {
        var fileContents, fileName, allowed, prohibited, reader;

        if ((typeof valueAccessor()) === "function") {
            fileContents = valueAccessor();
        } else {
            fileContents = valueAccessor()['data'];
            fileName = valueAccessor()['name'];

            allowed = valueAccessor()['allowed'];
            if ((typeof allowed) === 'string') {
                allowed = [allowed];
            }

            prohibited = valueAccessor()['prohibited'];
            if ((typeof prohibited) === 'string') {
                prohibited = [prohibited];
            }

            reader = (valueAccessor()['reader']);
        }

        reader || (reader = new FileReader());
        reader.onloadend = function () {
            fileContents(reader.result);
        }

        var handler = function () {
            var file = element.files[0];

            // Opening the file picker then canceling will trigger a 'change'
            // event without actually picking a file.
            if (file === undefined) {
                fileContents(null)
                return;
            }

            if (allowed) {
                if (!allowed.some(function (type) { return type === file.type })) {
                    console.log("File " + file.name + " is not an allowed type, ignoring.")
                    fileContents(null)
                    return;
                }
            }

            if (prohibited) {
                if (prohibited.some(function (type) { return type === file.type })) {
                    console.log("File " + file.name + " is a prohibited type, ignoring.")
                    fileContents(null)
                    return;
                }
            }

            reader.readAsDataURL(file); // A callback (above) will set fileContents
            if (typeof fileName === "function") {
                fileName(file.name)
            }
        }

        ko.utils.registerEventHandler(element, 'change', handler);
    }
};