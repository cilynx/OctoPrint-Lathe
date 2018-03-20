$(function() {

   function Feature(previousFeature) {
      var self = this;

      self.selected = ko.observable(false);
      console.log("previousFeature: ", previousFeature);
      self.position = ko.computed(function() { return previousFeature ? previousFeature.position()+1 : 0; }, self);
      console.log("self.position: ", self.position());
      self.start = ko.computed(function() { return previousFeature ? previousFeature.end() : 0; }, self);
      console.log("self.start: ", self.start());
      self.length = ko.observable(previousFeature ? previousFeature.length() : 10);
      console.log("self.length: ", self.length());
      self.leftDiameter = ko.observable(previousFeature ? previousFeature.rightDiameter() : 10);
      console.log("self.leftDiameter", self.leftDiameter());
      self.rightDiameter = ko.observable(self.leftDiameter());
      console.log("self.rightDiameter: ", self.rightDiameter());
      self.end = ko.computed(function() { return +self.start() + +self.length(); }, self);
      console.log("self.end: ", self.end());

      self.shape = ko.observable('straight');
      console.log("self.shape: ", self.shape());

      self.d = ko.computed(function() {
	 if(self.shape() === 'straight') {
	    return "M" + self.start() + " " + -self.leftDiameter()/2 +				// Upper Left
	       " l" + self.length() + " " + (self.leftDiameter()-self.rightDiameter())/2 +	// Upper Right
	       " l0" + " " + self.rightDiameter() +						// Lower Right
	       " l" + -self.length() + " " + -(self.rightDiameter()-self.leftDiameter())/2 +	// Lower Left
	       " z";										// Close the Path 
	 } else if(self.shape() === 'elliptical') {
	    return "M" + self.start() + " " + -self.leftDiameter()/2 +				// Upper Left
	       " a" + self.zRadius() + " " + self.xRadius() + " 0 0 " + self.convex() + " " + self.length() + " " + (self.leftDiameter()-self.rightDiameter())/2 +	// Upper Right
	       " l0" + " " + self.rightDiameter() +						// Lower Right
	       " a" + self.zRadius() + " " + self.xRadius() + " 0 0 " + self.convex() + " " + -self.length() + " " + -(self.rightDiameter()-self.leftDiameter())/2 +	// Lower Left
	       " z";										// Close the Path 
	 }
      }, self);
      console.log("self.d: ", self.d());

      self.xRadius = ko.observable(self.leftDiameter());
      self.zRadius = ko.observable(self.leftDiameter());
      self.convex = ko.observable(0);
   }

   function LatheViewModel(parameters) {
      var self = this;

      self.loginState = parameters[0];
      self.settings = parameters[1];

      self.selectedFeature = ko.observable("None");
      self.numberOfClicks = ko.observable(0);

      self.features = ko.observableArray([ new Feature() ]);

      self.lastFeature = ko.computed(function() { return self.features()[self.features().length-1]; }, self);

      self.addFeature = function() {
	 console.log("addFeature");
	 self.features.push(new Feature(self.lastFeature()));
	 $('#Feature-' + self.lastFeature().position()).click();
      }; 

      self.selectFeature = function(data, event) {
	 console.log("selectFeature");
	 self.numberOfClicks(self.numberOfClicks() + 1);
	 self.selectedFeature(event.target.id);
	 self.features().forEach(function(item, index) { item.selected(false); });
	 self.features()[event.target.id.replace("Feature-","")].selected(true);
	 $("path").css("fill", "none");
	 event.target.style.fill = "red";
      };  
   }

   // This is how our plugin registers itself with the application, by adding some configuration information to
   // the global variable ADDITIONAL_VIEWMODELS
   ADDITIONAL_VIEWMODELS.push([
      // This is the constructor to call for instantiating the plugin
      LatheViewModel,

      // This is a list of dependencies to inject into the plugin, the order which you request here is the order
      // in which the dependencies will be injected into your view model upon instantiation via the parameters
      // argument
      ["loginStateViewModel", "settingsViewModel"],

      // Finally, this is the list of all elements we want this view model to be bound to.
      [document.getElementById("tab_plugin_lathe")]
   ]);
});
