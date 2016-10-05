var elevator = 
{
    init: function(elevators, floors) {

        var alertMode = true;

        var elevatorRequests = [];
        var ElevatorRequest = function(floorNum, direction) {
            this.floorNum = floorNum;
            this.direction = direction;
        };

        Array.prototype.remove = function(from, to) {
            var rest = this.slice((to || from) + 1 || this.length);
            this.length = from < 0 ? this.length + from : from;
            return this.push.apply(this, rest);
        };

        function alertMessage(message) {
            if (alertMode == true) {
                alert(message);
            }
        }

        function addRequestToQueue(elevatorRequest){
            elevatorRequests.push(elevatorRequest);

            // Look for an idle lift to handle this right away
            for(var i = 0; i < elevators.length; i++) {
                var elevator = elevators[i];
                
                var requestHandled = false;
                if (elevator.destinationDirection() == "stopped") {
                    // elevator is idle, dispatch to the floor
                    if (elevatorRequest.floorNum == elevator.currentFloor()) {
                        // turn on the indicator for the requests direction
                        if (elevatorRequest.direction == "up") {
                            // going up
                            elevator.goingUpIndicator(true);
                            elevator.goingDownIndicator(false);                          
                        } else {
                            // going down
                            elevator.goingUpIndicator(false);
                            elevator.goingDownIndicator(true);
                        }
                        requestHandled = true;
                        break;
                    } else {
                        // move to the floor where the request exists
                        elevator.goToFloor(elevatorRequest.floorNum);
                        requestHandled = true;
                        break;
                    }
                }
            }
            if (requestHandled == false) {
                // here in case I want to handle an unhandled request somehow
            }
        }

        function floorHasPendingRequests(floorNum, direction) {
            for(var i = 0; i < elevatorRequests.length; i++) {
                if (elevatorRequests[i].floorNum == floorNum && elevatorRequests[i].direction == direction) {
                    return true;
                }
            }
            return false;
        }

        // Finds a request from that floor and direction and clears it from the queue
        // Designed to be run as a passenger gets in the lift
        function clearPendingRequest(floorNum, direction) {
            for(var i = 0; i < elevatorRequests.length; i++) {
                if (elevatorRequests[i].direction == direction && elevatorRequests[i].floorNum == floorNum) {
                    elevatorRequests.remove(i);
                    break;
                }
            }
        }

        function getNextPendingRequest() {
            if (elevatorRequests.length > 0) {
                return elevatorRequests[0];
            } else {
                return null;
            }
        }

        function getNextPendingRequestForFloor(floorNum) {
            if (elevatorRequests.length > 0) {
                for(var i = 0; i < elevatorRequests.length; i++) {
                    if (elevatorRequests[i].floorNum == floorNum) {
                        return elevatorRequests[i];
                    }
                }
            }
            return null;
        }

        function elevatorCanFitAnother(elevator) {
            if (elevator.loadFactor() == 1) {
                return false;
            }
            if (elevator.loadFactor() == 0) {
                return true;
            }
            return false;
        }

        function initElevator(elevator) {
            elevator.on("idle", function() {
                // keep checking for something in the queue to service
                var nextRequest = getNextPendingRequest();
                if (nextRequest != null) {
                    if (nextRequest.floorNum == elevator.currentFloor()) {
                        // turn on the indicator for the requests direction
                        if (nextRequest.direction == "up") {
                            // going up
                            elevator.goingUpIndicator(true);
                            elevator.goingDownIndicator(false);
                        } else {
                            // going down
                            elevator.goingUpIndicator(false);
                            elevator.goingDownIndicator(true);
                        }
                    } else {
                        // move to the floor where the request exists
                        elevator.goToFloor(nextRequest.floorNum);
                    }
                }
            });
            elevator.on("floor_button_pressed", function(floorNum) {
                var direction = "invalid";
                if (floorNum > elevator.currentFloor) {
                    direction = "up";
                }
                if (floorNum > elevator.currentFloor) {
                    direction = "down";
                }

                // clear this persons request from the queue
                clearPendingRequest(floorNum, direction);

                // add the new stop to the queue
                var currentQueue = elevator.destinationQueue;
                
                // Check if the floor is already in the queue
                var isAlreadyInQueue = false;
                for(var i = 0; i < currentQueue.length; i++) {
                    if (currentQueue[i] === floorNum) {
                        isAlreadyInQueue = true;
                    }
                }

                if (isAlreadyInQueue == false) {
                    currentQueue.push(floorNum);
                    if (direction == "up") {
                        currentQueue.sort(function(a, b){return a - b}); // sort lowest to highest
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(false); 
                    } else {
                        currentQueue.sort(function(a, b){return b - a}); // sort highest to lowest
                        elevator.goingUpIndicator(false);
                        elevator.goingDownIndicator(true);
                    }      

                    elevator.destinationQueue = currentQueue;
                    elevator.checkDestinationQueue();
                }
            });
            elevator.on("passing_floor", function(floorNum, direction) { 
                if (elevatorCanFitAnother(elevator) && floorHasPendingRequests(floorNum, direction)) {
                    var currentQueue = elevator.destinationQueue;
                    currentQueue.push(floorNum);
                    if (direction == "up") {
                        currentQueue.sort(function(a, b){return a - b}); // sort lowest to highest
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(false);  
                    } else {
                        currentQueue.sort(function(a, b){return b - a}); // sort highest to lowest
                        elevator.goingUpIndicator(false);
                        elevator.goingDownIndicator(true);
                    }                    
                    elevator.destinationQueue = currentQueue;
                    elevator.checkDestinationQueue();
                }
            });
            elevator.on("stopped_at_floor", function(floorNum) {
                
                if (elevator.getPressedFloors().length == 0) {
                    var nextRequest = getNextPendingRequestForFloor(floorNum);
                    if (nextRequest == null) {
                        // set both lights to let anyone on
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(true);
                    } else {
                        // set lights for the first request found
                        if (nextRequest.direction == "up") {
                            // going up
                            elevator.goingUpIndicator(true);
                            elevator.goingDownIndicator(false);  
                        } else {
                            // going down
                            elevator.goingUpIndicator(false);
                            elevator.goingDownIndicator(true);
                        }
                    }
                } else {
                    var nextStop = elevator.destinationQueue[0];
                    if (nextStop > floorNum) {
                        // going up
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(false);  
                    } else {
                        // going down
                        elevator.goingUpIndicator(false);
                        elevator.goingDownIndicator(true);
                    }
                }
            });
        }

        for(var i = 0; i < elevators.length; i++) {
            initElevator(elevators[i]);
        }
        //initElevator(elevators[0]);


        function initFloor(floor) {
            floor.on("up_button_pressed", function() {
                addRequestToQueue(new ElevatorRequest(floor.floorNum(), "up"));
            });
            floor.on("down_button_pressed", function() {
                addRequestToQueue(new ElevatorRequest(floor.floorNum(), "down"));
            });
        };

        for(var i = 0; i < floors.length; i++) {
            initFloor(floors[i]);
        }
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}
