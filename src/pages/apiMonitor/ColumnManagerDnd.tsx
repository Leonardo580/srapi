import React, { useMemo, useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    closestCorners,
    useDraggable,
    useDroppable,
    DragOverlay,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
    Card,
    Typography,
    Tag,
    Row,
    Col,
    Empty,
    Space, // AntD Space for layout of tags
} from 'antd';

const { Title, Text } = Typography;

export interface ColumnDnDItem {
    id: string;
    header: string;
}

interface DraggableTagProps {
    item: ColumnDnDItem;
    isOverlay?: boolean;
}

const DraggableTag: React.FC<DraggableTagProps> = ({ item, isOverlay }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
        data: { item }, // Pass item data for DragOverlay
    });

    const style: React.CSSProperties = transform && !isOverlay
        ? {
            transform: CSS.Translate.toString(transform),
            cursor: 'grab',
            opacity: isDragging ? 0.5 : 1,
            zIndex: isDragging ? 1000 : 'auto',
            margin: '4px 0', // Adjust margin as needed
            display: 'inline-block', // Important for transform on inline-like elements
        }
        : {
            cursor: 'grab',
            opacity: isDragging && !isOverlay ? 0.5 : 1,
            margin: '4px 0',
            display: 'inline-block',
        };

    const tagProps = {
        children: item.header,
        style: { ...style, ...(isOverlay && { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)', cursor: 'grabbing' }) },
    };

    if (isOverlay) {
        // Style for the item being dragged in the overlay
        return <Tag {...tagProps} ref={setNodeRef} />;
    }

    return (
        <Tag ref={setNodeRef} {...attributes} {...listeners} {...tagProps} />
    );
};

interface DroppableZoneProps {
    id: string;
    title: string;
    items: ColumnDnDItem[];
    activeDragId: string | null;
}

const DroppableZone: React.FC<DroppableZoneProps> = ({ id, title, items, activeDragId }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <Col xs={24} sm={12} style={{ display: 'flex', flexDirection: 'column' }}>
            <Card
                title={title}
                ref={setNodeRef}
                style={{
                    flexGrow: 1, // Make card fill the column height
                    minHeight: 300,
                    backgroundColor: isOver ? '#e6f7ff' : undefined, // AntD light blue for hover
                    border: isOver ? '2px dashed #1677ff' : '1px solid #d9d9d9', // AntD primary color
                    display: 'flex',
                    flexDirection: 'column',
                }}
                bodyStyle={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }}
            >
                {items.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Empty description={<Text type="secondary">(No columns here)</Text>} />
                    </div>
                ) : (
                    <Space wrap size={[8, 8]} align="start"> {/* Use Space for wrapping tags */}
                        {items.map(item => (
                            // Render placeholder if item is being dragged from this list
                            activeDragId === item.id ?
                                <Tag key={`${item.id}-placeholder`} style={{ visibility: 'hidden', margin: '4px 0' }}>{item.header}</Tag>
                                : <DraggableTag key={item.id} item={item} />
                        ))}
                    </Space>
                )}
            </Card>
        </Col>
    );
};

interface ColumnManagerDnDProps {
    allPossibleColumns: ColumnDnDItem[];
    currentVisibility: Record<string, boolean>;
    onVisibilityChange: (newVisibility: Record<string, boolean>) => void;
}

const ColumnManagerDnD: React.FC<ColumnManagerDnDProps> = ({
                                                               allPossibleColumns,
                                                               currentVisibility,
                                                               onVisibilityChange,
                                                           }) => {
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [activeDragItem, setActiveDragItem] = useState<ColumnDnDItem | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const { visibleColumns, hiddenColumns } = useMemo(() => {
        const v: ColumnDnDItem[] = [];
        const h: ColumnDnDItem[] = [];
        allPossibleColumns.forEach(col => {
            if (currentVisibility[col.id] === true || currentVisibility[col.id] === undefined) {
                v.push(col);
            } else {
                h.push(col);
            }
        });
        // Optional: Sort columns alphabetically within each list for consistency
        // v.sort((a, b) => a.header.localeCompare(b.header));
        // h.sort((a, b) => a.header.localeCompare(b.header));
        return { visibleColumns: v, hiddenColumns: h };
    }, [allPossibleColumns, currentVisibility]);

    const handleDragStart = (event: any) => { // `any` or define DragStartEvent from @dnd-kit/core if available
        setActiveDragId(event.active.id as string);
        setActiveDragItem(event.active.data.current?.item as ColumnDnDItem);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        setActiveDragItem(null);
        const { active, over } = event;

        if (!over || !active) return;

        const draggedItemId = active.id as string;
        const targetZoneId = over.id as string; // 'visible-zone' or 'hidden-zone'

        const isCurrentlyVisible = visibleColumns.some(col => col.id === draggedItemId);
        let newVisibility = { ...currentVisibility };

        if (targetZoneId === 'visible-zone' && !isCurrentlyVisible) {
            newVisibility[draggedItemId] = true;
        } else if (targetZoneId === 'hidden-zone' && isCurrentlyVisible) {
            newVisibility[draggedItemId] = false;
        } else {
            // No change in visibility status (e.g., dragged within same zone or to invalid area)
            return;
        }
        onVisibilityChange(newVisibility);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div style={{ border: '1px solid #f0f0f0', padding: '16px', borderRadius: '8px', background: '#fff' }}>
                <Title level={5} style={{ marginBottom: '16px', textAlign: 'center' }}>
                    Manage Column Visibility
                </Title>
                <Row gutter={[16, 16]} align="stretch"> {/* Gutter for spacing, align stretch for equal height */}
                    <DroppableZone id="hidden-zone" title="Available / Hidden Columns" items={hiddenColumns} activeDragId={activeDragId} />
                    <DroppableZone id="visible-zone" title="Visible Columns" items={visibleColumns} activeDragId={activeDragId} />
                </Row>
            </div>
            <DragOverlay dropAnimation={null}>
                {activeDragId && activeDragItem ? <DraggableTag item={activeDragItem} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
};

export default ColumnManagerDnD;