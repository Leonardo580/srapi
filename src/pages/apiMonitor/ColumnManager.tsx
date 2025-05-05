import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Tag, Card, Typography, Row, Col, Empty, theme } from "antd";

const { Title } = Typography;

interface ColumnManagerProps {
	allFields: string[]; // All unique fields discovered from data
	visibleFields: string[]; // Fields currently shown in the grid
	onVisibilityChange: (newVisibleFields: string[]) => void; // Callback to update parent
	// Optional: Map field names to friendlier header names
	fieldHeaderMap?: Record<string, string>;
}

// Helper to reorder a list
const reorder = (list: string[], startIndex: number, endIndex: number): string[] => {
	const result = Array.from(list);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);
	return result;
};

// Helper to move an item between lists
const move = (
	source: string[],
	destination: string[],
	droppableSource: any, // DraggableLocation from react-beautiful-dnd
	droppableDestination: any, // DraggableLocation from react-beautiful-dnd
): { source: string[]; destination: string[] } => {
	const sourceClone = Array.from(source);
	const destClone = Array.from(destination);
	const [removed] = sourceClone.splice(droppableSource.index, 1);
	destClone.splice(droppableDestination.index, 0, removed);
	return { source: sourceClone, destination: destClone };
};

// Helper to get a display name for a field
const getDisplayName = (field: string, map?: Record<string, string>): string => {
	if (map && map[field]) {
		return map[field];
	}
	// Simple capitalization for default
	return field
		.replace(/_/g, " ")
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (str) => str.toUpperCase())
		.trim();
};

const ColumnManager: React.FC<ColumnManagerProps> = ({
	allFields,
	visibleFields,
	onVisibilityChange,
	fieldHeaderMap,
}) => {
	const { token } = theme.useToken();

	const availableFields = allFields.filter((f) => !visibleFields.includes(f));

	const onDragEnd = (result: DropResult) => {
		const { source, destination } = result;

		// Dropped outside the list
		if (!destination) {
			return;
		}

		const sourceId = source.droppableId;
		const destinationId = destination.droppableId;

		if (sourceId === destinationId) {
			// Reordering within the same list
			if (sourceId === "visible") {
				const reorderedVisible = reorder(visibleFields, source.index, destination.index);
				onVisibilityChange(reorderedVisible);
			}
			// Reordering available fields doesn't change visibility, so we can ignore or implement if needed
		} else {
			// Moving between lists
			let newVisibleFields: string[];
			if (sourceId === "available" && destinationId === "visible") {
				const result = move(availableFields, visibleFields, source, destination);
				newVisibleFields = result.destination;
			} else if (sourceId === "visible" && destinationId === "available") {
				const result = move(visibleFields, availableFields, source, destination);
				// Result.destination is the new 'available' list, we need result.source for the new 'visible' list
				newVisibleFields = result.source;
			} else {
				// Should not happen with only two lists
				return;
			}
			onVisibilityChange(newVisibleFields);
		}
	};

	const gridStyle: React.CSSProperties = {
		padding: "10px",
		minHeight: "100px", // Ensure drop zone has height
		background: token.colorFillAlter,
		borderRadius: token.borderRadiusLG,
		transition: "background-color 0.2s ease",
	};

	const getItemStyle = (isDragging: boolean, draggableStyle: any): React.CSSProperties => ({
		userSelect: "none",
		padding: `2px ${token.paddingXS}px`,
		margin: `0 ${token.marginXS}px ${token.marginXS}px 0`,
		background: isDragging ? token.colorPrimaryActive : token.colorBgContainer,
		border: `1px solid ${token.colorBorder}`,
		borderRadius: token.borderRadiusSM,
		display: "inline-block", // Important for inline layout
		cursor: "grab",
		...draggableStyle,
	});

	return (
		<Card size="small" style={{ marginBottom: token.margin }}>
			<DragDropContext onDragEnd={onDragEnd}>
				<Row gutter={[16, 16]}>
					{/* Available Columns */}
					<Col xs={24} md={12}>
						<Title level={5}>Available Columns</Title>
						<Droppable droppableId="available" direction="horizontal">
							{(provided, snapshot) => (
								<div
									ref={provided.innerRef}
									style={{
										...gridStyle,
										background: snapshot.isDraggingOver ? token.colorPrimaryBgHover : token.colorFillAlter,
									}}
									{...provided.droppableProps}
								>
									{availableFields.length > 0 ? (
										availableFields.map((field, index) => (
											<Draggable key={field} draggableId={field} index={index}>
												{(provided, snapshot) => (
													<Tag
														ref={provided.innerRef}
														{...provided.draggableProps}
														{...provided.dragHandleProps}
														style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
													>
														{getDisplayName(field, fieldHeaderMap)}
													</Tag>
												)}
											</Draggable>
										))
									) : (
										<Empty
											image={Empty.PRESENTED_IMAGE_SIMPLE}
											description="All fields visible"
											style={{ padding: "10px 0" }}
										/>
									)}
									{provided.placeholder}
								</div>
							)}
						</Droppable>
					</Col>

					{/* Visible Columns */}
					<Col xs={24} md={12}>
						<Title level={5}>Visible Columns (Drag to reorder)</Title>
						<Droppable droppableId="visible" direction="horizontal">
							{(provided, snapshot) => (
								<div
									ref={provided.innerRef}
									style={{
										...gridStyle,
										background: snapshot.isDraggingOver ? token.colorPrimaryBgHover : token.colorFillAlter,
									}}
									{...provided.droppableProps}
								>
									{visibleFields.length > 0 ? (
										visibleFields.map((field, index) => (
											<Draggable key={field} draggableId={field} index={index}>
												{(provided, snapshot) => (
													<Tag
														ref={provided.innerRef}
														{...provided.draggableProps}
														{...provided.dragHandleProps}
														style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
													>
														{getDisplayName(field, fieldHeaderMap)}
													</Tag>
												)}
											</Draggable>
										))
									) : (
										<Empty
											image={Empty.PRESENTED_IMAGE_SIMPLE}
											description="Drag fields here"
											style={{ padding: "10px 0" }}
										/>
									)}
									{provided.placeholder}
								</div>
							)}
						</Droppable>
					</Col>
				</Row>
			</DragDropContext>
		</Card>
	);
};

export default ColumnManager;
