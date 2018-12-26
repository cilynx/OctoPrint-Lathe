$(function () {
    "use strict";
    function EndpointArcGcode(x1, y1, x2, y2, rx, ry, phi, fA, fS, fn, fP, fF, fY) {
        // x1   Absolute coordinate of starting point
        // y1   Absolute coordinate of starting point
        // x2   Absolute coordinate of ending point
        // y2   Absolute coordinate of ending point
        // rx   Ellipse X-Radius
        // ry   Ellipse Y-Radius
        // phi  Ellipse axis rotation
        // fA   0 if arc spans <180 degrees, 1 if arc spans >180 degrees
        // fS   0 if sweep decreasing, 1 if sweep increasing
        // fn   Number of segments in linear approximation
        // fP   Pitch (turns/mm)
        // fF   Feed rate (mm/min)
        // fY   Y Start

        // SVG Implementation Notes:
        // https://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter

        console.log("x1: ", x1);
        console.log("y1: ", y1);
        console.log("x2: ", x2);
        console.log("y2: ", y2);
        console.log("rx: ", rx);
        console.log("ry: ", ry);
        console.log("phi: ", phi);
        console.log("fA: ", fA);
        console.log("fS: ", fS);
        console.log("fn: ", fn);

        // Equation 5.1
        var x1_ = Math.cos(phi) * (x1-x2)/2 + Math.sin(phi) * (y1-y2)/2;
        console.log("x1_: ", x1_);
        var y1_ = -Math.sin(phi) * (x1-x2)/2 + Math.cos(phi) * (y1-y2)/2;
        console.log("y1_: ", y1_);

        // Equation 5.2
        var rx2 = rx * rx;
        console.log("rx2: ", rx2);
        var ry2 = ry * ry;
        console.log("ry2: ", ry2);
        var x1_2 = x1_ * x1_;
        console.log("x1_2: ", x1_2);
        var y1_2 = y1_ * y1_;
        console.log("y1_2: ", y1_2);

        var amp = ((fA == fS) ? -1 : 1) * Math.sqrt((rx2*ry2-rx2*y1_2-ry2*x1_2)/(rx2*y1_2+ry2*x1_2));
        console.log("amp: ", amp);

        var cx_ = amp * rx * y1_ / ry;
        console.log("cx_: ", cx_);
        var cy_ = amp * -ry * x1_ / rx;
        console.log("cy_: ", cy_);

        // Equation 5.3
        var cx = Math.cos(phi) * cx_ - Math.sin(phi) * cy_ + (x1+x2)/2;
        console.log("cx: ", cx);
        var cy = Math.sin(phi) * cx_ + Math.cos(phi) * cy_ + (y1+y2)/2;
        console.log("cy: ", cy);

        // Equation 5.4
        var mag = function(v) {
            console.log("Mag:", v[0], v[1], Math.sqrt(v[0]*v[0] + v[1]*v[1]));
            return Math.sqrt(v[0]*v[0] + v[1]*v[1]);
        };
        var dot = function(u, v) {
            console.log("Dot:", u[0]*v[0] + u[1]*v[1]);
            return u[0]*v[0] + u[1]*v[1];
        };
        var angle = function(u, v) { return (u[0]*v[1] < u[1]*v[0] ? -1 : 1) * Math.acos(dot(u,v)/((mag(u)*mag(v)))); };

        // Equation 5.5
        var t1 = angle([1,0], [(x1_-cx_)/rx, (y1_-cy_)/ry]);
        console.log("t1: ", t1);

        // Equation 5.6
        var mod = function(v, n) { return ((v%n)+n)%n; };
        var dt = angle([(x1_-cx_)/rx, (y1_-cy_)/ry], [(-x1_-cx_)/rx, (-y1_-cy_)/ry]);

        if(fA) { dt = mod(dt, 2 * Math.PI); }

        if(fS == 0 && dt > 0) {
            dt -= 2 * Math.PI;
        } else if(fS == 1 && dt < 0) {
            dt += 2 * Math.PI;
        }

        console.log("dt: ", dt);

        // Equation 3.1
        var slice = dt/fn;
        console.log("slice: ", slice);
        var coords = Array(fn).fill().map(
            (_, i) => [
                Math.cos(phi) * rx*Math.cos(t1+i*slice) - Math.sin(phi) * ry*Math.sin(t1+i*slice) + cx,
                Math.sin(phi) * rx*Math.cos(t1+i*slice) + Math.cos(phi) * ry*Math.sin(t1+i*slice) + cy
            ]
        );

        var gcode = "G1 X" + y2 + " Z" + x2 + " Y" + fY + " F" + fF + "\n";
        var z_previous = x2;
        for(var i = coords.length - 1; i > 0; i--) {
            gcode += "G1 X" + coords[i][1].toFixed(6) + " Z" + coords[i][0].toFixed(6) + " Y" + (fY+360*fP*(z_previous - coords[i][0])).toFixed(6) + "\n";
            fY = fY+360*fP*(z_previous - coords[i][0])
            z_previous = coords[i][0];
        }
        gcode += "G1 X" + y1 + " Z" + x1 + " Y" + (fY+360*fP*(z_previous - x1)).toFixed(6) + "\n";

        console.log(gcode);

        return(gcode);
    }

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
        self.resolution = ko.observable(previousFeature ? previousFeature.resolution() : 1);
        console.log("self.resolution: ", self.resolution());
        self.feedRate = ko.observable(previousFeature ? previousFeature.feedRate() : 10000);
        console.log("self.feedRate: ", self.feedRate());
        self.fn= ko.observable(previousFeature ? previousFeature.fn() : 10);
        console.log("self.fn: ", self.fn());
        self.stockDiameter = ko.observable(previousFeature ? previousFeature.stockDiameter() : 30);
        console.log("self.stockDiameter: ", self.stockDiameter());
        self.end = ko.computed(function() { return +self.start() + +self.length(); }, self);
        console.log("self.end: ", self.end());
        self.nextEnd = ko.observable(false);
        console.log("self.nextEnd: ", self.nextEnd());
        self.yStart = ko.computed(function() { return self.nextEnd() ? self.nextEnd() : 0; }, self);
        console.log("self.yStart: ", self.yStart());
        self.yEnd = ko.computed(function() { return self.yStart() + 360*self.resolution()*(self.end()-self.start()); }, self);
        console.log("self.yEnd: ", self.yEnd());

        if(previousFeature) {
            previousFeature.nextEnd(self.yEnd());
        }

        //        self.yEnd = ko.computed(function() { return previousFeature ? previousFeature.yStart() : 0; }, self);
        //        console.log("self.yEnd: ", self.yEnd());
        //        self.yStart = ko.computed(function() { return self.yEnd() - 360*self.resolution()*(self.end()-self.start()); }, self);
        //        console.log("self.yStart: ", self.yStart());
        self.shape = ko.observable("straight");
        console.log("self.shape: ", self.shape());

        self.gcode = "";

        self.d = ko.computed(function() {
            if(self.shape() === "straight") {
                return "M" + self.start() + " " + -self.leftDiameter()/2 +                      // Upper Left
                " l" + self.length() + " " + (self.leftDiameter()-self.rightDiameter())/2 +     // Upper Right
                " l0" + " " + self.rightDiameter() +                                            // Lower Right
                " l" + -self.length() + " " + -(self.rightDiameter()-self.leftDiameter())/2 +   // Lower Left
                " z";                                                                           // Close the Path
            } else if(self.shape() === "elliptical") {
                self.gcode = EndpointArcGcode(
                    self.start(),               // z1   Absolute coordinate of starting point
                    self.leftDiameter()/2,      // x1   Absolute coordinate of starting point
                    self.end(),                 // z2   Absolute coordinate of ending point
                    self.rightDiameter()/2,     // x2   Absolute coordinate of ending point
                    self.zRadius(),             // rz   Z-Radius of ellipse
                    self.xRadius(),             // rx   X-Radius of ellipse
                    0,                          // phi  Ellipse axis rotation
                    0,                          // fA   0 if arc spans <180 degrees, 1 if arc spans >180 degrees
                    self.convex() ? 0 : 1,      // fS   0 if sweep decreasing, 1 if sweep increasing
                    self.fn(),                  // fn   Number of segments in linear approximation
                    self.resolution(),          // fP   Pitch (turns/mm)
                    self.feedRate(),            // fF   Feed rate (mm/min)
                    self.yStart()               // fY   Y start position
                );
                return "M" + self.start() + " " + -self.leftDiameter()/2 +                      // Upper Left
                " a" + self.zRadius() + " " + self.xRadius() + " 0 0 " + self.convex() + " " +  // Upper Right
                self.length() + " " + (self.leftDiameter()-self.rightDiameter())/2 +            // (cont)
                " l0" + " " + self.rightDiameter() +                                            // Lower Right
                " a" + self.zRadius() + " " + self.xRadius() + " 0 0 " + self.convex() + " " +  // Lower Left
                -self.length() + " " + -(self.rightDiameter()-self.leftDiameter())/2 +          // (cont)
                " z";                                                                           // Close the Path
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
        self.terminal = parameters[2];

        self.selectedFeature = ko.observable("None");
        self.numberOfClicks = ko.observable(0);

        self.features = ko.observableArray([ new Feature() ]);

        self.lastFeature = ko.computed(function() { return self.features()[self.features().length-1]; }, self);

        self.addFeature = function() {
            console.log("addFeature");
            self.features.push(new Feature(self.lastFeature()));
            $("#Feature-" + self.lastFeature().position()).click();
        };

        self.generateGcode = function() {
            var gcode = "";
            var z_max = 0;
            var x_max = 0;
            self.features().slice().reverse().forEach(function(item) {
                if(item.end() > z_max) { z_max = item.end(); }
                if(item.stockDiameter() / 2 > x_max) { x_max = item.stockDiameter() / 2; }
                gcode += "; Begin Feature-" + item.position() + "\n" + item.gcode + "; End Feature-" + item.position() + "\n";
            });
            return("; Begin inital positioning\nG0 X" + (x_max+5) + "\nG0 Z" + (z_max+5) + " Y0\n; End initial positioning\n" + gcode);
        };

        self.showGcode = function() {
            console.log("showGcode");
            $("#ViewGcodeModal").find('.modal-body').html(self.generateGcode().replace(/\n/g, "<br>\n"));
            $("#ViewGcodeModal").modal();
        };

        self.sendGcode = function() {
            console.log("sendGcode");
            console.log(self.generateGcode());
            self.generateGcode().split("\n").forEach(function(line) {
                self.terminal.command(line);
                self.terminal.sendCommand();
            });
        }

        self.selectFeature = function(data, event) {
            console.log("selectFeature");
            var id = event.target.id.replace("Feature-","");
            self.numberOfClicks(self.numberOfClicks() + 1);
            self.selectedFeature("Feature-" + id);
            self.features().forEach(function(item) { item.selected(false); });
            self.features()[id].selected(true);
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
        ["loginStateViewModel", "settingsViewModel", "terminalViewModel"],

        // Finally, this is the list of all elements we want this view model to be bound to.
        [document.getElementById("tab_plugin_lathe")]
    ]);
});
