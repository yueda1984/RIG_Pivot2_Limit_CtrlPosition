/*
	Pivot To Transformation-Limit Control Position

	This Toon Boom Harmony shelf script copies pivot positions from a Peg or Drawing node and paste on Transformation-Limit node's pivot.
	
		v1.2 - Deletes unlinked bezier column.
		v1.21 - Makes the control position cursor visible after setting its positions.		
	
	
	Installation:
	
	1) Download and Unarchive the zip file.
	2) Locate to your user scripts folder (a hidden folder):
	   https://docs.toonboom.com/help/harmony-17/premium/scripting/import-script.html	
	   
	3) There is a folder named "src" inside the zip file. Copy all its contents directly to the folder above.
	4) In Harmony, add RIG_Pivot_To_TransformationLimit_Ctrl_Position function to any toolbar.	
	
	
	Direction:
	

	1) Select one Transformation-Limit and either one Drawing or Peg.
	2) Run RIG_Pivot_To_TransformationLimit_Ctrl_Position.

	Author:

		Yu Ueda (raindropmoment.com)
*/

function RIG_Pivot_To_TransformationLimit_Ctrl_Position()
{
	var numOfNodesSelected = selection.numberOfNodesSelected();
	var stopmotionKeyframe = preferences.getBool("SP_CONSTANT_SEGMENT", false);
	var pivotSourceIsDrawing;
	var limitNode = [], drawingNode = [], pegNode = [];
	
	
	for (var i = 0; i < numOfNodesSelected; i++)
	{
		var sNode = selection.selectedNode(i);
		
		if (node.type(sNode) == "TransformLimit")
			limitNode.push(sNode);
		else if (node.type(sNode) == "READ")
			drawingNode.push(sNode);	
		else if (node.type(sNode) == "PEG")
			pegNode.push(sNode);
	}
	
	
	// Check if required nodes are selected and also the source of pivot is drawing or pivot:	
	if (limitNode.length == 1 && drawingNode.length == 1)
	{
		pivotSourceIsDrawing = true;
		var pivotSource = drawingNode[0];
		var embeddedPivotOption = node.getTextAttr (pivotSource, 1, "useDrawingPivot");
	}
	else if (limitNode.length == 1 && pegNode.length == 1)
		var pivotSource = pegNode[0];
	else
	{
		MessageBox.information("Please select one Transformation-Limit and either one Drawing or Peg.");
		return;
	}

	
	//-------------------------------- Main Process -------------------------------->
	
	scene.beginUndoRedoAccum("Copy Pivots and set on Transformation-Limit");
	
	
	// If Stop-Motion Keyframes pref is off, turn it on:
	if (!stopmotionKeyframe);
		preferences.setBool("SP_CONSTANT_SEGMENT", true);

	// If pivot source is drawing, set to apply on drawing:
	if (pivotSourceIsDrawing && embeddedPivotOption !== "Apply Embedded Pivot on Drawing Layer")
		node.setTextAttr (pivotSource, "useDrawingPivot", 1, "Apply Embedded Pivot on Drawing Layer");
	
	var limitOffsetX = addNewBezier("LimitCtrl_Pos_x");
	var limitOffsetY = addNewBezier("LimitCtrl_Pos_y");
	var copiedPivot = node.getPivot(pivotSource, 1);
	
	link2NewBezier(limitOffsetX, "pos.x", limitNode[0]);
	link2NewBezier(limitOffsetY, "pos.y", limitNode[0]);
	
	column.setEntry (limitOffsetX, 0, 1, copiedPivot.x);
	column.setEntry (limitOffsetY, 0, 1, copiedPivot.y);
	
	var sceneLength = frame.numberOf();
	
	for (var currentFrame = 2; currentFrame <= sceneLength ; currentFrame ++)
	{	
		copiedPivot = node.getPivot(pivotSource, currentFrame);
		var previousPivot = node.getPivot(pivotSource, currentFrame -1);

		// If pivot is different from the previous frame, copy the pivot position form the source node.
		if (copiedPivot.x !== previousPivot.x || copiedPivot.y !== previousPivot.y)
		{
			column.setEntry (limitOffsetX, 0, currentFrame, copiedPivot.x);
			column.setEntry (limitOffsetY, 0, currentFrame, copiedPivot.y);
		}
	}
	
	// Set Stop-Motion Keyframes pref back to original:
	preferences.setBool("SP_CONSTANT_SEGMENT", stopmotionKeyframe);
	
	// Set embedded pivot option back to original:
	node.setTextAttr (pivotSource, "useDrawingPivot", 1, embeddedPivotOption);

	// select transformation limit node and show its control position
	selection.clearSelection();
	selection.addNodeToSelection(limitNode[0]);
	Action.perform("onActionToggleControl()");
	
	scene.endUndoRedoAccum();
	
	
	
	
	// Create a new bezier column with a unique name:
	function addNewBezier(columnName)
	{
		var suffix = 0;
		var originalName = columnName;

		while (column.getDisplayName(columnName))    //true == name is taken
		{
			suffix += 1;
			columnName = originalName + "_" + suffix;	
		} 
		
		column.add(columnName, "BEZIER");
		return columnName;
	}
	
	// Link a column to the specified attribute:		
	function link2NewBezier(columnName, attrName, argNode)
	{
		var colOG = node.linkedColumn(argNode, attrName);			
		node.unlinkAttr(argNode, attrName);
		column.removeUnlinkedFunctionColumn(colOG);				
		node.linkAttr(argNode, attrName, columnName);
		column.setKeyFrame (columnName, 1);
	}	
}