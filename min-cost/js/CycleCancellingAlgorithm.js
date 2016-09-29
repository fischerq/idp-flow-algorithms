/**
 * Ford-Fulkerson Algorithmus 
 * @author Quirin Fischer
 * @augments GraphDrawer
 * @class
 */
function CycleCancellingAlgorithm(svgSelection)
{
    GraphDrawer.call(this,svgSelection);

    //insert markers
    var definitions  = svgSelection.append("defs")
        .attr("id", "line-markers");

    definitions.append("marker")
        .attr("id", "flow-arrow")
        .attr("refX",12 ) /*must be smarter way to calculate shift*/
        .attr("refY",2)
        .attr("markerWidth", 12)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
            .attr("d", "M 0,0 V 4 L6,2 Z")
            .attr("fill", const_Colors.NormalEdgeColor); //this is actual shape for arrowhead

    definitions.append("marker")
        .attr("id", "residual-forward")
        .attr("refX",14) /*must be smarter way to calculate shift*/
        .attr("refY",3)
        .attr("markerWidth", 14)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
            .attr("d", "M 2,3 L0,6 L8,3 Z")
            .attr("fill", const_Colors.NormalEdgeColor); //this is actual shape for arrowhead

    definitions.append("marker")
        .attr("id", "residual-backward")
        .attr("refX",0) /*must be smarter way to calculate shift*/
        .attr("refY",3)
        .attr("markerWidth", 14)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
            .attr("d", "M 6,3 L12,3 L14,0 Z")
            .attr("fill", const_Colors.NormalEdgeColor); //this is actual shape for arrowhead


    /**
     * closure for this class
     * @type CycleCancellingAlgorithm
     */
    var that = this;
    var algo = that;
    
    var debugConsole = false;
    
    var STEP_SELECTSOURCE =     "select-source";
    var STEP_SELECTTARGET =     "select-target";
    var STEP_START =            "start-algorithm";
    var STEP_GETMAXFLOW =       "get-max-flow";
    var STEP_MAINLOOP =         "main-loop";
    var STEP_FINDNEGATIVECYCLE =  "find-neg-cycle";
    var STEP_ADJUSTCYCLE =   "adjust-cycle";
    var STEP_FINISHED =         "finished";

    /**
     * the logger instance
     * @type Logger
     */
    var logger = new Logger(d3.select("#logger"));


    /**
     * status variables
     * @type Object
     */
    var state = null;
    
    var colormap = ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"].reverse();
    
    function flowWidth(val) {
        var maxCap = d3.max(Graph.instance.getEdges(), function(d) {
            return d.resources[0]
        });
        return 25 * (val / maxCap);
    }

    this.flowWidth = flowWidth;
    
    this.nodeLabel = function(d) {
        if (d.id == state.sourceId)
            return "s";
        else if (d.id == state.targetId)
            return "t";
        else
            return d.id;
    }
    
//     this.nodeText = function(d) {
//         if(s.id != STEP_FINISHED) return d.state.excess + "," + d.state.height;
// //         return CycleCancellingAlgorithm.prototype.nodeText.call(this,d);

//     }

    this.nodeText = "";
    
    this.edgeText = function(d) {
        if(!state.show_residual_graph)
            return "("+d.state.flow+"/"+d.resources[0]+","+d.resources[1]+")";
        else
        {
            if(d.state.flow < d.resources[0])
                return d.resources[1];
            else
                return "";
        }
    }

    this.edgeTextBelow = 
    function(d) {
        if(state.show_residual_graph && d.state.flow > 0)
            return -d.resources[1];
        else
            return "";
    }
    
    this.onNodesEntered = function(selection) {
        //select source and target nodes
        selection
        .on("click", function(d) {
            if (    state.current_step == STEP_SELECTSOURCE ||
                    (state.current_step == STEP_SELECTTARGET && d.id != state.sourceId) )
            {
                that.nextStepChoice(d);
            }
        })

        //       selection.append("text")
        //         .attr("class","height")
        //         .attr("dy", "-1.2em")           // set offset y position
        //         .attr("text-anchor", "left");

        //       selection.append("text")
        //         .attr("class","excess unselectable")
        //         .attr("dy", "2.0em")           // set offset y position
        //         .attr("text-anchor", "right");
    }
    
    this.onNodesUpdated = function(selection) {
        selection
        .selectAll("circle")
//         .style("stroke", function(d) {
//             if (d.id == s.currentNodeId) {
//                 return const_Colors.NodeBorderHighlight;
//             } else {
//                 return global_NodeLayout['borderColor'];
//             }
//         })
//         .style("stroke-width", function(d) {
//             if (s.activeNodeIds.indexOf(d.id) >= 0) {
//                 return "5px";
//             } else if (d.id == s.currentNodeId) {
//                 return "7px";
//             } else {
//                 return "2px";
//             }
//         })
        .style("fill", function(d) {
            if (d.id == state.sourceId)
                return const_Colors.StartNodeColor; //green
            else if (d.id == state.targetId)
                return const_Colors.StartNodeColor;//NodeFillingQuestion; // NodeFillingLight
            else
                return global_NodeLayout['fillStyle'];
        //        return colormap[Math.min(10,d.height)];
        })

        //     selection.selectAll(".excess")
        //         .transition()
        //         .text(function(d){return "e:"+d.excess})

        //     selection.selectAll(".height")
        //         .transition()
        //         .text(function(d){return "h:"+d.height});
        
      
//         selection.selectAll(".excessBar")
//         .transition()
//         .attr("y", function(d) {
//             return h - flowWidth(Math.abs(d.state.excess))
//         })
//         .attr("height", function(d) {
//             return flowWidth(Math.abs(d.state.excess))
//         })
//         .style("display",(s.id != STEP_FINISHED) ? "block" : "none");
    }
    
    this.onEdgesEntered = function(selection) {
         selection.append("line")
            .attr("class", "cap")
            .style("stroke-width",
                    function(d)
                    {
                        return algo.flowWidth(d.resources[0]);
                    })

          selection.append("line")
            .attr("class", "flow")
    }
    
    this.onEdgesUpdated = function(selection) {

        selection.selectAll("line.flow")
            .style("stroke-width",
                function(d)
                {
                    return algo.flowWidth(Graph.instance.edges.get(d.id).state.flow)
                })

        selection.select(".arrow")
            .style("stroke",
                function(d)
                {
                    if(state.cycle.find(function(e){return e["edge"] == d.id;}))
                        return "red";
                    else
                        return "black";
                })
            .attr("marker-end", 
                function(d){
                    if(!state.show_residual_graph)
                    {
                        return "url(#flow-arrow)";
                    }
                    else
                    {
                        if(d.resources[0] - d.state.flow > 0)
                            return "url(#residual-forward)";
                        else
                            return "";
                    }
                })
            .attr("marker-start", 
                function(d){
                    if(!state.show_residual_graph)
                    {
                        return "";
                    }
                    else
                    {
                        if(d.state.flow > 0)
                            return "url(#residual-backward)";
                        else
                            return "";
                    }
                });


        selection.selectAll("line.cap")
            .style("visibility",
                function()
                {
                    return !state.show_residual_graph ? "visible" : "hidden";
                });
        selection.selectAll("line.flow")
            .style("visibility",
                function()
                {
                    return !state.show_residual_graph ? "visible": "hidden";
                });

    }


    /**
     * Replay Stack, speichert alle Schritte des Ablaufs für Zurück Button
     * @type {Array}
     */
    var replayHistory = new Array();

    var fastforwardOptions = {label: $("#ta_button_text_fastforward").text(), icons: {primary: "ui-icon-seek-next"}};

    /**
     * Initialisiert das Zeichenfeld
     * @method
     */
    this.init = function() {

        Graph.addChangeListener(function(){
            that.clear();
            that.reset();
            that.squeeze();
            that.update();
        });

        this.reset();
        this.update();
    };

    /**
     * clear all states
     */
    this.reset = function(){
        state = {
            current_step: STEP_SELECTSOURCE, //status id
            sourceId: -1,
            targetId: -1,
            cycle_min_flow: 0,
            cycle: []
        };

        logger.data = [];
        this.replayHistory = [];

        if(Graph.instance){
            //prepare graph for this algorithm: add special properties to nodes and edges
            Graph.instance.nodes.forEach(function(key, node) {
                node.state.predecessor = null;
            })

            Graph.instance.edges.forEach(function(key, edge) {
                edge.state.flow = 0;
            })
        }
    }

    /**
     * Makes the view consistent with the state
     * @method
     */
    this.update = function(){

        this.updateDescriptionAndPseudocode();
        this.updateVariableState();
        
        this.updateGraphState();
        logger.update();

        if(Graph.instance){
             CycleCancellingAlgorithm.prototype.update.call(this); //updates the graph
        }
    }

    /**
     * When Tab comes into view
     * @method
     */
    this.activate = function() {
        this.reset();
        this.squeeze();
        this.update();
    };

    /**
     * tab disappears from view
     * @method
     */
    this.deactivate = function() {
        this.stopFastForward();
        this.replayHistory = [];
    //         this.deregisterEventHandlers();
    };
    

    /**
     * add a step to the replay stack, serialize stateful data
     * @method
     */
    this.addReplayStep = function() {
        
        replayHistory.push({
            "graphState": Graph.instance.getState(),
            "state": JSON.stringify(state),
            //             "htmlSidebar": $("#ta_div_statusErklaerung").html(),
            "legende": $("#tab_ta").find(".LegendeText").html(),
            "loggerData": JSON.stringify(logger.data)
        });
        
        //if (debugConsole)
        //    console.log("Current History Step: ", replayHistory[replayHistory.length - 1]);
    
    };

    /**
     * playback the last step from stack, deserialize stateful data
     * @method
     */
    this.previousStepChoice = function() {
        
        var oldState = replayHistory.pop();
        if (debugConsole)
            console.log("Replay Step", oldState);
        
        Graph.instance.setState(oldState.graphState);
        state = JSON.parse(oldState.state);
        logger.data = JSON.parse(oldState.loggerData);
        //         $("#ta_div_statusErklaerung").html(oldState.htmlSidebar);
        $("#tab_ta").find(".LegendeText").html(oldState.legende);
        
        this.update();
    };

    /**
     * updates status description and pseudocode highlight based on current step
     * @method
     */
    this.updateDescriptionAndPseudocode = function() {
        var sel = d3.select("#ta_div_statusPseudocode").selectAll("div");
        sel.classed("marked", function(a, pInDivCounter, divCounter) {
            return d3.select(this).attr("id") === "pseudocode-"+state.current_step;
        });
        
        var sel = d3.select("#ta_div_statusErklaerung").selectAll("div");
        sel.style("display", function(a, divCounter) {
            return (d3.select(this).attr("id") === "explanation-"+state.current_step) ? "block" : "none";
        });

        var disable_back_button = state.current_step === STEP_SELECTSOURCE;
        var disable_forward_button = 
                        (state.current_step === STEP_SELECTSOURCE ||
                        state.current_step === STEP_SELECTTARGET ||
                        state.current_step === STEP_FINISHED);
        var disable_fastforward_button = 
                        (state.current_step === STEP_SELECTSOURCE ||
                        state.current_step === STEP_SELECTTARGET ||
                        state.current_step === STEP_FINISHED);

        $("#ta_button_Zurueck").button("option", "disabled", disable_back_button);
        $("#ta_button_1Schritt").button("option", "disabled", disable_forward_button);
        $("#ta_button_vorspulen").button("option", "disabled", disable_fastforward_button);
    };

    this.updateGraphState = function()
    {
        var state_label = "";
        if(state.show_residual_graph)
            state_label = "Residual Graph";

        d3.select("#graph-state").text(state_label);
        d3.select("#graph-info").style("display", state.show_residual_graph ? "block" : "none");
    }

    this.updateVariableState = function()
    {
        var cycle_edge_strings = [];
        for(var i = state.cycle.length-1; i>=0; i--)  //reverse to get path from s to t
        {
            var edge = Graph.instance.edges.get(state.cycle[i]["edge"]);

            var start_id = edge.start.id;
            var end_id = edge.end.id;

            var edge_string = "";
            if(start_id == state.sourceId)
                edge_string+= "s";
            else if(start_id == state.targetId)
                edge_string += "t";
            else
                edge_string += start_id;

            edge_string += "->"

            if(end_id == state.sourceId)
                edge_string += "s";
            else if(end_id == state.targetId)
                edge_string += "t";
            else
                edge_string += end_id;

            cycle_edge_strings.push(edge_string);
        }
        var cycle_string = "["+cycle_edge_strings.join(",")+"]";

        d3.select("#variable-value-cycle").text(cycle_string);
        d3.select("#variable-value-adjustment").text(state.cycle_min_flow);
    }

    ///////////////////////
    ///Actual algorithm steps

    /**
     * Executes the next step in the algorithm
     * @method
     */
    this.nextStepChoice = function(d)
    {
        
        if (debugConsole)
            console.log("State Before: " + state.current_step);

        // Speichere aktuellen Schritt im Stack
        this.addReplayStep();
        
        switch (state.current_step) {
            case STEP_SELECTSOURCE:
                this.selectSource(d);
                break;
            case STEP_SELECTTARGET:
                this.selectTarget(d);
                break;
            case STEP_START: 
                logger.log("Now the algorithm can start");
                state.current_step = STEP_GETMAXFLOW;
                break;
            case STEP_GETMAXFLOW:
                getMaxFlow();
                break;
            case STEP_MAINLOOP:
                mainLoop();
                break;
            case STEP_FINDNEGATIVECYCLE:
                findNegativeCycle();
                break;
            case STEP_ADJUSTCYCLE:
                adjustCycle();
                break;
            case STEP_FINISHED:
                this.stopFastForward();
                break;
            default:
                console.log("Fehlerhafter State");
                break;
        }
        if (debugConsole)
            console.log("State After: " + state.current_step);

        //update view with status values
        this.update();
    };


    /**
     * select the source node
     */
    this.selectSource = function(d)
    {
        state.sourceId = d.id;
        state.current_step = STEP_SELECTTARGET;
        logger.log("selected node " + d.id + " as source");
    };

    /**
     * select the target node
     */
    this.selectTarget = function(d)
    {
        state.targetId = d.id;
        state.current_step = STEP_START;
        logger.log("selected node " + d.id + " as target");
    };

    /////////////
    //following is ford-fulkerson 

    /**
 * initialize the flow
 */
    function getMaxFlow()
    {

        //TODO do a edmonds-karp
        Graph.instance.edges.forEach(
            function(key, edge)
            {
                edge.state.flow = 0;
            })
        
        var no_path_found = false;

        while(!no_path_found)
        {
            Graph.instance.nodes.forEach(
                function(key, node)
                {
                    node.state.predecessor = null;
                })
            var search_queue = [state.sourceId];
            var source = Graph.instance.nodes.get(state.sourceId);
            source.state.predecessor = {};

            while(Graph.instance.nodes.get(state.targetId).state.predecessor == null && search_queue.length > 0 )
            {
                var node_to_expand = search_queue.shift();
                var node = Graph.instance.nodes.get(node_to_expand);

                var out_edges = node.getOutEdges();
                for (var i = 0; i < out_edges.length; i++)
                {
                    var edge_out = out_edges[i];

                    //valid residual edge (forward push along outgoing edge)
                    if(edge_out.end.state.predecessor == null && edge_out.resources[0] > edge_out.state.flow)
                    {
                        search_queue.push(edge_out.end.id);
                        edge_out.end.state.predecessor = 
                            {
                                "node": node_to_expand,
                                "edge": edge_out.id,
                                "residual-capacity":edge_out.resources[0] - edge_out.state.flow,
                                "direction": 1
                            };
                    }
                }

                var in_edges = node.getInEdges();
                /*backward edges*/
                for (var i = 0; i < in_edges.length; i++)
                {
                    var edge_in = in_edges[i];

                    //valid residual edge (back push along incoming edge)
                    if(edge_in.start.state.predecessor == null && edge_in.state.flow > 0)
                    {
                        search_queue.push(edge_in.start.id);
                        edge_in.start.state.predecessor = 
                            {
                                "node": node_to_expand,
                                "edge": edge_in.id,
                                "residual-capacity": edge_in.state.flow,
                                "direction": -1
                            };
                    }
                }
            }

            if(Graph.instance.nodes.get(state.targetId).state.predecessor != null)
            {
                var path = [];
                var augmentation = Number.MAX_SAFE_INTEGER;
                var next_path_node = state.targetId;

                //gather path
                while(next_path_node != state.sourceId)
                {
                    var node = Graph.instance.nodes.get(next_path_node);
                    path.push(node.state.predecessor);
                    augmentation = Math.min(node.state.predecessor["residual-capacity"], augmentation);
                    next_path_node = node.state.predecessor["node"];
                }

                //apply path
                for (var i = 0; i < path.length; i++)
                {
                    var predecessor = path[i];
                    var edge = Graph.instance.edges.get(predecessor["edge"]);
                    edge.state.flow += predecessor["direction"] * augmentation;
                }
            }
            else
                no_path_found = true;
        }
        state.current_step = STEP_MAINLOOP;
        
        logger.log("Init to maxflow.");
    }

    /**
 * main loop: find negative cycles to reduce cost
 */
    function mainLoop()
    {
        if (state.no_cycle_found) {
            state.current_step = STEP_FINISHED; //so that we display finished, not mainloop when done
            
            that.stopFastForward();

            logger.log("Finished with a min cost of "+finalflow);
        }
        else
        {
            logger.log("Not finished, starting search for augmentation cycle ");
            state.show_residual_graph = true;
            state.current_step = STEP_FINDNEGATIVECYCLE;
        }
    }

    /**
 * run bellman ford to find negative cycle
 */
    function findNegativeCycle()
    {
        Graph.instance.nodes.forEach(
            function(key, node)
            {
                node.state.distance = Number.MAX_SAFE_INTEGER;
                node.state.predecessor = null;
            });

        var target  = Graph.instance.nodes.get(state.targetId);
        target.state.distance = 0;

        for(var i = 0; i < Graph.instance.nodes.size(); ++i)
        {
            Graph.instance.edges.forEach(
                function(key, edge)
                {
                    var node_start = edge.start;//Graph.instance.nodes.get(edge.start);
                    var node_end = edge.end;//Graph.instance.nodes.get(edge.end);
                    
                    //adjust distance for edges in residual graph
                    if(edge.resources[0] > edge.state.flow)
                    {
                        if(node_start.state.distance + edge.resources[1] < node_end.state.distance)
                        {
                            node_end.state.distance = node_start.state.distance + edge.resources[1];
                            node_end.state.predecessor = 
                                {
                                    "prev_node": node_start.id,
                                    "edge": edge.id,
                                    "direction": 1
                                };
                        }
                    }

                    if(edge.state.flow > 0)
                    {
                        if(node_end.state.distance - edge.resources[1] < node_start.state.distance)
                        {
                            node_start.state.distance = node_end.state.distance - edge.resources[1];
                            node_start.state.predecessor = {
                                    "prev_node": node_end.id,
                                    "edge": edge.id,
                                    "direction": -1
                                };
                        }
                    }
                });
        }
        Graph.instance.nodes.forEach(function(key,node)
            {
                console.log(node.id, " dist ", node.state.distance);
            });
        var has_cycle = false;

        Graph.instance.edges.forEach(
            function(key, edge)
            {
                var node_start = Graph.instance.nodes.get(edge.start.id);
                var node_end = Graph.instance.nodes.get(edge.end.id);
                
                //adjust distance for edges in residual graph
                if(edge.resources[0] > edge.state.flow)
                {
                    if(node_start.state.distance + edge.resources[1] < node_end.state.distance)
                    {
                        has_cycle = true;
                    }
                }

                if(edge.state.flow > 0)
                {
                    if(node_end.state.distance - edge.resources[1] < node_start.state.distance)
                    {
                        has_cycle = true;
                    }
                }
            });


        state.no_cycle_found = true;
        if(has_cycle)
        {
            state.cycle_min_flow = Number.MAX_SAFE_INTEGER;
            var cycle_node_stack = [state.targetId];
            while(state.no_cycle_found)
            {
                var last_node = Graph.instance.nodes.get(cycle_node_stack[cycle_node_stack.length -1]);
                var new_node =  last_node.state.predecessor.prev_node;

                state.cycle.push(last_node.state.predecessor)

                for(var i = 0; i < cycle_node_stack.length; i++)
                {
                    if(cycle_node_stack[i] == new_node)
                    {
                        state.cycle.splice(0, i);
                        state.no_cycle_found = false;
                        break;
                    }
                }
                if(state.no_cycle_found)
                {
                    cycle_node_stack.push(new_node);
                }
            }

            for(var i = 0; i < state.cycle.length; ++i)
            {
                var cycle_edge = Graph.instance.edges.get(state.cycle[i].edge);
                if(state.cycle[i].direction == 1)
                {
                    state.cycle_min_flow = Math.min(state.cycle_min_flow, cycle_edge.resources[0] - cycle_edge.state.flow);
                }
                else
                {
                    state.cycle_min_flow = Math.min(state.cycle_min_flow, cycle_edge.state.flow);
                }
            }
        }

        if(!state.no_cycle_found)
        {
            state.current_step = STEP_ADJUSTCYCLE;
        }
        else
        {
            state.show_residual_graph = false;
            state.current_step = STEP_MAINLOOP;
        }
    }

    /**
 * adjust flow using the found cycle
 */
    function adjustCycle()
    {

        for(var i = 0; i < state.cycle.length; ++i)
        {
            var edge = Graph.instance.edges.get(state.cycle[i]["edge"]);

            edge.state.flow += state.cycle_min_flow * state.cycle[i]["direction"];
        }
        
        state.cycle_min_flow = 0;
        state.cycle = [];
        state.show_residual_graph = false;
        state.current_step = STEP_MAINLOOP; 
    }
}

// Vererbung realisieren
CycleCancellingAlgorithm.prototype = Object.create(GraphDrawer.prototype);
CycleCancellingAlgorithm.prototype.constructor = CycleCancellingAlgorithm;
