/**
 * Ford-Fulkerson Algorithmus 
 * @author Quirin Fischer
 * @augments GraphDrawer
 * @class
 */
function FordFulkersonAlgorithm(svgSelection)
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
     * @type FordFulkersonAlgorithm
     */
    var that = this;
    var algo = that;
    
    var debugConsole = true;
    
    var STEP_SELECTSOURCE =     "select-source";
    var STEP_SELECTTARGET =     "select-target";
    var STEP_START =            "start-algorithm";
    var STEP_INITFLOW =         "init-flow";
    var STEP_MAINLOOP =         "main-loop";
    var STEP_STARTPATHSEARCH =  "start-path-search";//actually fast forwards all the path search
    var STEP_CHECKPATHFOUND =   "check-path-found";
    var STEP_EXPANDNODE =       "expand-node";
    var STEP_INITPATHGATHERING= "init-path-gathering";
    var STEP_ITERATEPATH =      "iterate-path";
    var STEP_APPLYPATH =        "apply-augmentation-path"; //
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
// //         return FordFulkersonAlgorithm.prototype.nodeText.call(this,d);

//     }

    this.nodeText = "";
    
    this.edgeText = function(d) {
        if(state.show_residual_graph)
        {
            if(d.resources[0] - d.state.flow > 0)
            return d.resources[0] - d.state.flow;
        }
        else
        {
            return (d.state.flow != null ? d.state.flow+"/" : "") + d.resources[0];
        }
    }

    this.edgeTextBelow = 
    function(d) {
        if(state.show_residual_graph)
        {
            if(d.state.flow > 0)
            return d.state.flow;
        }
        else
        {
            return "";
        }
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
            if (d.id == state.next_node_to_search || d.id == state.next_path_node)
            {
                return "red";//const_Colors.CurrentNodeColor;
            }
            else if(state.expanding && d.state.predecessor && state.search_queue.indexOf(d.id) < 0)
            {
                return "grey"//const_Colors.FinishedNodeColor;
            }
            else if (state.expanding && state.search_queue.indexOf(d.id) >= 0)
            {
                return "yellow";//const_Colors.PQColor;
            }
            else if (d.id == state.sourceId)
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
                    if(state.path.find(function(pred){return pred.edge == d.id;}))
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
            no_path_found: false,
            show_residual_graph: false,
            search_queue: [],
            next_node_to_search: null,
            path: [],
            next_path_node: null,
            augmentation: 0
        };

        logger.data = [];
        this.replayHistory = [];

        if(Graph.instance){
            //prepare graph for this algorithm: add special properties to nodes and edges
            Graph.instance.nodes.forEach(function(key, node) {
                node.state.predecessor = null;
            })

            Graph.instance.edges.forEach(function(key, edge) {
                edge.state.flow = null;
            })
        }
    }

    /**
     * Makes the view consistent with the state
     * @method
     */
    this.update = function(){

        this.updateDescriptionAndPseudocode();
        this.updateVariables();
        this.updateGraphState();
        logger.update();

        if(Graph.instance){
             FordFulkersonAlgorithm.prototype.update.call(this); //updates the graph
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
        
        if (debugConsole)
            console.log("Current History Step: ", replayHistory[replayHistory.length - 1]);
    
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

    this.updateVariables = function()
    {
        var path_edge_strings = [];
        for(var i = state.path.length-1; i>=0; i--)  //reverse to get path from s to t
        {
            var edge = Graph.instance.edges.get(state.path[i]["edge"]);

            var start_id = 0;
            var end_id = 0;
            if(state.path[i]["direction"] > 0)
            {    
                start_id = edge.start.id;
                end_id = edge.end.id;
            }
            else
            {    
                start_id = edge.end.id;
                end_id = edge.start.id;
            }

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

            path_edge_strings.push(edge_string);
        }
        var path_string = "["+path_edge_strings.join(",")+"]";

        d3.select("#variable-value-path").text(path_string);
        d3.select("#variable-value-augmentation").text(state.augmentation);
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
                state.current_step = STEP_INITFLOW;
                break;
            case STEP_INITFLOW:
                initFlow();
                break;
            case STEP_MAINLOOP:
                mainLoop();
                break;
            case STEP_STARTPATHSEARCH:
                startPathSearch();
                break;
            case STEP_CHECKPATHFOUND:
                checkPathFound();
                break;
            case STEP_EXPANDNODE:
                expandNode();
                break;
            case STEP_INITPATHGATHERING:
                initPathGathering();
                break;
            case STEP_ITERATEPATH:
                iteratePath();
                break;
            case STEP_APPLYPATH:
                applyPath();
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
    function initFlow()
    {
        Graph.instance.edges.forEach(
            function(key, edge)
            {
                edge.state.flow = 0;
            })
        
        state.no_path_found = false;

        state.current_step = STEP_MAINLOOP;
        
        logger.log("Init Flow to zero.");
    }

    /**
 * main loop: find augmentation paths while possible to increase the flow
 */
    function mainLoop()
    {
        if (state.no_path_found) {
            state.current_step = STEP_FINISHED; //so that we display finished, not mainloop when done
            that.stopFastForward();

            logger.log("Finished!");
        }
        else
        {
            logger.log("Not finished, starting search for augmentation path ");
            state.show_residual_graph = true;
            state.current_step = STEP_STARTPATHSEARCH;
        }
    }

    /**
 * starts the search for a new augmentation path
 */
    function startPathSearch()
    {


        var nodes = Graph.instance.nodes.values();
                
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            //init preflow from source node
            n.state.predecessor = null;
        }
        
        state.expanding = true;
        state.search_queue = [state.sourceId];
        var source = Graph.instance.nodes.get(state.sourceId);
        source.state.predecessor = {};

        logger.log("Initialised path search ");
        
        checkPathFound();
        //state.current_step = STEP_CHECKPATHFOUND;
    }

    /**
 * starts the search for a new augmentation path
 */
    function checkPathFound()
    {
        var target = Graph.instance.nodes.get(state.targetId);

        if(target.state.predecessor != null)
        {
            state.expanding = false;
            logger.log("Found path");
            state.next_node_to_search = state.targetId;
            
            initPathGathering()
            //state.current_step = STEP_INITPATHGATHERING;
        }
        else if(state.search_queue.length > 0)
        {
            logger.log("Path search continues");
            state.next_node_to_search =  state.search_queue[state.search_queue.length-1];
            
            expandNode()
            //state.current_step = STEP_EXPANDNODE;
        }
        else
        {
            state.expanding = false;
            state.show_residual_graph = false;
            
           logger.log("No more nodes to expand");
            state.no_path_found = true;
            state.next_node_to_search = null;

            state.current_step = STEP_MAINLOOP; 
        }
    }

    /**
 * expand current search node
 */
    function expandNode()
    {
        var node_to_expand = state.search_queue.pop();
        logger.log("Expanding node "+node_to_expand);
        var node = Graph.instance.nodes.get(node_to_expand);

        var out_edges = node.getOutEdges();
        /*forward edges*/
        for (var i = 0; i < out_edges.length; i++) {
            var edge = out_edges[i];

            //valid residual edge (forward push along outgoing edge)
            if(edge.end.state.predecessor == null && edge.resources[0] > edge.state.flow)
            {
                state.search_queue.push(edge.end.id);
                edge.end.state.predecessor = 
                    {
                        "node": node_to_expand,
                        "edge": edge.id,
                        "residual-capacity":edge.resources[0] - edge.state.flow,
                        "direction": 1
                    };
            }
        }
        
        var in_edges = node.getInEdges();
        /*backward edges*/
        for (var i = 0; i < in_edges.length; i++)
        {
            var edge = in_edges[i];

            //valid residual edge (back push along incoming edge)
            if(edge.start.state.predecessor == null && edge.state.flow > 0)
            {
                state.search_queue.push(edge.start.id);
                edge.start.state.predecessor = 
                    {
                        "node": node_to_expand,
                        "edge": edge.id,
                        "residual-capacity": edge.state.flow,
                        "direction": -1
                    };
            }


        }

        checkPathFound()
        //state.current_step = STEP_CHECKPATHFOUND;
    }

    /**
 * starts collecting the augmentation path
 */
    function initPathGathering() {

        state.next_node_to_search = null;
        state.next_path_node = state.targetId;
        state.path = [];
        state.augmentation = Number.MAX_SAFE_INTEGER;

        logger.log("Init path");

        iteratePath();
        //state.current_step = STEP_ITERATEPATH;
    }

        /**
 * starts collecting the augmentation path
 */
    function iteratePath() {

        var node = Graph.instance.nodes.get(state.next_path_node);
        state.path.push(node.state.predecessor);
        state.augmentation = Math.min(node.state.predecessor["residual-capacity"], state.augmentation);
        state.next_path_node = node.state.predecessor["node"];

        logger.log("Added edge "+node.state.predecessor.edge+"to path");

        if(state.next_path_node != state.sourceId)
        {
            iteratePath();
            //state.current_step = STEP_ITERATEPATH;
        }
        else
        {
            state.next_path_node = null;

            state.current_step = STEP_APPLYPATH;
        }
    }

    function applyPath() {
        for (var i = 0; i < state.path.length; i++)
        {
            var predecessor = state.path[i];
            var edge = Graph.instance.edges.get(predecessor["edge"]);
            edge.state.flow += predecessor["direction"] * state.augmentation;
        }

        state.path = [];
        state.augmentation = 0;

        logger.log("Applied augmenting path with flow "+state.augmentation);
        state.show_residual_graph = false;
        state.current_step = STEP_MAINLOOP;
    }
}

// Vererbung realisieren
FordFulkersonAlgorithm.prototype = Object.create(GraphDrawer.prototype);
FordFulkersonAlgorithm.prototype.constructor = FordFulkersonAlgorithm;
