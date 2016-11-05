(function($){

	/*
	 *  Location
	 *
	 *  static model for this field
	 *
	 *  @type	event
	 *  @date	1/06/13
	 *
	 */

	acf.fields.multimap = {

		$el : null,
		$input : null,

		o : {},
		api: {
			sensor:		false,
			libraries:	'places'
		},

		ready : false,
		geocoder : false,
		map : false,
		maps : {},

		set : function( o ){

			// merge in new option
			$.extend( this, o );


			// find input
			this.$input = this.$el.find('.input-address');


			// get options
			this.o = acf.helpers.get_atts( this.$el );


			// get map
			if( this.maps[ this.o.id ] )
			{
				this.map = this.maps[ this.o.id ];
			}


			// return this for chaining
			return this;

		},
		init : function(){

			// geocode
			if( !this.geocoder )
			{
				this.geocoder = new google.maps.Geocoder();
			}


			// google maps is loaded and ready
			this.ready = true;


			// is clone field?
			if( acf.helpers.is_clone_field(this.$input) )
			{
				return;
			}

			this.render();

		},
		render : function(){

			// reference
			var _this	= this,
				_$el	= this.$el;


			// vars
			var args = {
				zoom		: parseInt(this.o.zoom),
				center		: new google.maps.LatLng(this.o.lat, this.o.lng),
				mapTypeId	: google.maps.MapTypeId.ROADMAP
			};

			// create map
			this.map = new google.maps.Map( this.$el.find('.canvas')[0], args);


			// add search
			var autocomplete = new google.maps.places.Autocomplete( this.$el.find('.search')[0] );
			autocomplete.map = this.map;
			autocomplete.bindTo('bounds', this.map);


			// add dummy marker
			this.map.markers = [];


			// add references
			this.map.$el = this.$el;


			// value exists?
			var lat = this.$el.find('.input-lat').map(function(){return $(this).val();}),
				lng = this.$el.find('.input-lng').map(function(){return $(this).val();});

			for(var i = 0; i<lat.length; i++){
				this.addMarker(new google.maps.LatLng(lat[i], lng[i]), false);
			}


			// events
			google.maps.event.addListener(autocomplete, 'place_changed', function( e ) {

				// reference
				var $el = this.map.$el;


				// manually update address
				var address = $el.find('.search').val();
				$el.find('.input-address').val( address );
				$el.find('.title h4').text( address );


				// vars
				var place = this.getPlace();


				// validate
				if( place.geometry )
				{
					var lat = place.geometry.location.lat(),
						lng = place.geometry.location.lng();


					_this.set({ $el : $el }).update( lat, lng ).center();
				}
				else
				{
					// client hit enter, manulaly get the place
					_this.geocoder.geocode({ 'address' : address }, function( results, status ){

						// validate
						if( status != google.maps.GeocoderStatus.OK )
						{
							console.log('Geocoder failed due to: ' + status);
							return;
						}

						if( !results[0] )
						{
							console.log('No results found');
							return;
						}


						// get place
						place = results[0];

						var lat = place.geometry.location.lat(),
							lng = place.geometry.location.lng();


						_this.set({ $el : $el }).update( lat, lng ).center();

					});
				}

			});


			google.maps.event.addListener( this.map, 'click', function( e ) {

				// reference
				var $el = this.$el;


				// vars
				var lat = e.latLng.lat(),
					lng = e.latLng.lng();


				_this.set({ $el : $el }).update( lat, lng ).sync();

			});

			if(this.map.markers.length >= 1){
				var bounds = new google.maps.LatLngBounds();
				for (var i = 0; i < this.map.markers.length; i++) {
					bounds.extend(this.map.markers[i].getPosition());
				}
				this.map.fitBounds(bounds);
			}


			// add to maps
			this.maps[ this.o.id ] = this.map;


		},

		update : function( lat, lng, index ){
			// If no marker index is specified use the last marker that was added
			if(typeof index === 'undefined'){
				index = this.map.markers.length-1;
			}

			// vars
			var latlng = new google.maps.LatLng( lat, lng );


			// update inputs
			this.$el.find('.input-lat:eq('+index+')').val( lat );
			this.$el.find('.input-lng:eq('+index+')').val( lng ).trigger('change');


			// update marker
			this.map.markers[index].setPosition( latlng );


			// show marker
			this.map.markers[index].setVisible( true );


			// update class
			this.$el.addClass('active');


			// validation
			this.$el.closest('.field').removeClass('error');


			// return for chaining
			return this;
		},

		center : function(){

			// vars
			var position = this.map.markers[0].getPosition(),
				lat = this.o.lat,
				lng = this.o.lng;


			// if marker exists, center on the marker
			if( position )
			{
				lat = position.lat();
				lng = position.lng();
			}


			var latlng = new google.maps.LatLng( lat, lng );


			// set center of map
			this.map.setCenter( latlng );
		},

		sync : function(){

			// reference
			var $el	= this.$el;


			// vars
			var position = this.map.markers[0].getPosition(),
				latlng = new google.maps.LatLng( position.lat(), position.lng() );


			this.geocoder.geocode({ 'latLng' : latlng }, function( results, status ){

				// validate
				if( status != google.maps.GeocoderStatus.OK )
				{
					console.log('Geocoder failed due to: ' + status);
					return;
				}

				if( !results[0] )
				{
					console.log('No results found');
					return;
				}


				// get location
				var location = results[0];


				// update h4
				$el.find('.title h4').text( location.formatted_address );


				// update input
				$el.find('.input-address').val( location.formatted_address ).trigger('change');

			});


			// return for chaining
			return this;
		},

		locate : function(){

			// reference
			var _this	= this,
				_$el	= this.$el;


			// Try HTML5 geolocation
			if( ! navigator.geolocation )
			{
				alert( acf.l10n.google_map.browser_support );
				return this;
			}


			// show loading text
			_$el.find('.title h4').text(acf.l10n.google_map.locating + '...');
			_$el.addClass('active');

			navigator.geolocation.getCurrentPosition(function(position){

				// vars
				var lat = position.coords.latitude,
					lng = position.coords.longitude;

				_this.set({ $el : _$el }).update( lat, lng ).sync().center();

			});


		},

		clear : function(){

			// update class
			this.$el.removeClass('active');


			// clear search
			this.$el.find('.search').val('');


			// clear inputs
			this.$el.find('.input-address').val('');
			this.$el.find('.input-lat').val('');
			this.$el.find('.input-lng').val('');


			// remove all but one marker (hide the last one)
			for(var i=0; i<this.map.markers.length; i++){
				this.map.markers[i].setVisible( false );
				if(i>0){
					this.map.markers[i].map = null;
					this.map.markers[i] = null;
				}
			}
			this.map.markers.length = 1;

			// remove obsolet input fields
			this.$el.find('.input-address:gt(0)').remove();
			this.$el.find('.input-lat:gt(0)').remove();
			this.$el.find('.input-lng:gt(0)').remove();
		},

		edit : function(){

			// update class
			this.$el.removeClass('active');


			// clear search
			var val = this.$el.find('.title h4').text();


			this.$el.find('.search').val( val ).focus();

		},

		refresh : function(){

			// trigger resize on div
			google.maps.event.trigger(this.map, 'resize');

			// center map
			this.center();

		},

		addMarker: function(position, addInputFields){
			var _this	= this;
			console.log(position, addInputFields);
			if(position === null){
				position = this.map.getCenter();
			}
			var index = this.map.markers.length;
			var marker = new google.maps.Marker({
				draggable	: true,
				raiseOnDrag	: true,
				map			: this.map,
				label		: index+""
			});
			this.map.markers.push(marker);
			marker.setPosition(position);
			marker.setVisible(true);

			google.maps.event.addListener( marker, 'dragend', function(){
				// reference
				var $el = this.map.$el;

				// vars
				var position = marker.getPosition(),
					lat = position.lat(),
					lng = position.lng();

				_this.update( lat, lng, index );
			});

			if(addInputFields){
				var $markers = this.$el.find('.acf-google-multimap-markers');
				var fieldName = $markers.attr('data-fieldname');

				var $addressInput = $('<input type="hidden" class="input-address" name="" value="" />');
				$addressInput.attr('name', fieldName+"["+(this.map.markers.length-1)+"][address]");
				this.$el.find('.acf-google-multimap-markers').append($addressInput);

				var $latInput = $('<input type="hidden" class="input-lat" name="" value="" />');
				$latInput.val(marker.getPosition().lat);
				$latInput.attr('name', fieldName+"["+(this.map.markers.length-1)+"][lat]");
				this.$el.find('.acf-google-multimap-markers').append($latInput);

				var $lngInput = $('<input type="hidden" class="input-lng" name="" value="" />');
				$lngInput.val(marker.getPosition().lng);
				$lngInput.attr('name', fieldName+"["+(this.map.markers.length-1)+"][lng]");
				this.$el.find('.acf-google-multimap-markers').append($lngInput);
			}
		}

	};


	/*
	 *  acf/setup_fields
	 *
	 *  run init function on all elements for this field
	 *
	 *  @type	event
	 *  @date	20/07/13
	 *
	 *  @param	{object}	e		event object
	 *  @param	{object}	el		DOM object which may contain new ACF elements
	 *  @return	N/A
	 */

	$(document).on('acf/setup_fields', function(e, el){

		// reference
		var self = acf.fields.multimap;


		// vars
		var $fields = $(el).find('.acf-google-multimap');


		// validate
		if( ! $fields.exists() ) return false;


		// no google
		if( !acf.helpers.isset(window, 'google', 'load') ) {

			// load API
			$.getScript('https://www.google.com/jsapi', function(){

				// load maps
				google.load('maps', '3', { other_params: $.param(self.api), callback: function(){

					$fields.each(function(){

						acf.fields.multimap.set({ $el : $(this) }).init();

					});

				}});

			});

			return false;

		}


		// no maps or places
		if( !acf.helpers.isset(window, 'google', 'maps', 'places') ) {

			google.load('maps', '3', { other_params: $.param(self.api), callback: function(){

				$fields.each(function(){

					acf.fields.multimap.set({ $el : $(this) }).init();

				});

			}});

			return false;

		}


		// google exists
		$fields.each(function(){

			acf.fields.multimap.set({ $el : $(this) }).init();

		});


		// return
		return true;

	});


	/*
	 *  Events
	 *
	 *  jQuery events for this field
	 *
	 *  @type	function
	 *  @date	1/03/2011
	 *
	 *  @param	N/A
	 *  @return	N/A
	 */

	$(document).on('click', '.acf-google-multimap .acf-sprite-remove', function( e ){

		e.preventDefault();

		acf.fields.multimap.set({ $el : $(this).closest('.acf-google-multimap') }).clear();

		$(this).blur();

	});


	$(document).on('click', '.acf-google-multimap .acf-sprite-locate', function( e ){

		e.preventDefault();

		acf.fields.multimap.set({ $el : $(this).closest('.acf-google-multimap') }).locate();

		$(this).blur();

	});

	$(document).on('click', '.acf-google-multimap .title h4', function( e ){

		e.preventDefault();

		acf.fields.multimap.set({ $el : $(this).closest('.acf-google-multimap') }).edit();

	});

	$(document).on('keydown', '.acf-google-multimap .search', function( e ){

		// prevent form from submitting
		if( e.which == 13 )
		{
			return false;
		}

	});

	$(document).on('blur', '.acf-google-multimap .search', function( e ){

		// vars
		var $el = $(this).closest('.acf-google-multimap');


		// has a value?
		if( $el.find('.input-lat').val() )
		{
			$el.addClass('active');
		}

	});

	$(document).on('acf/fields/tab/show acf/conditional_logic/show', function( e, $field ){

		// validate
		if( ! acf.fields.multimap.ready )
		{
			return;
		}


		// validate
		if( $field.attr('data-field_type') == 'google_map' )
		{
			acf.fields.multimap.set({ $el : $field.find('.acf-google-multimap') }).refresh();
		}

	});

	$(document).on('click', '.acf-google-multimap .acf-add-location-marker', function( e ){

		e.preventDefault();

		acf.fields.multimap.addMarker(null, true);

	});



})(jQuery);
