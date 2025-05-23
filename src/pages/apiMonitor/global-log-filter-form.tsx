// src/components/GlobalLogFilterForm.tsx
import React, { useEffect, useState, useRef } from 'react'; // Added useRef
import { Form, Input, Button, Select, DatePicker, Row, Col, Space, Spin, InputNumber, Alert, Typography, message, Divider } from 'antd'; // Added Typography, message
import { PlusOutlined, MinusCircleOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons'; // Added more icons
import type { GlobalFilterState, DynamicFilterItem } from './LogsTable';
import type { FieldMappingInfo } from '@/utils/mappingHelper';
import ElasticService from '@/api/services/elasticService';
import { toast as sonnerToast } from 'sonner'; // Assuming you use sonner
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

interface GlobalLogFilterFormProps {
    onApplyFilters: (filters: GlobalFilterState) => void;
    initialFilters?: GlobalFilterState;
    loading?: boolean; // This is the loading state from the parent (e.g., table loading)
}

const GlobalLogFilterForm: React.FC<GlobalLogFilterFormProps> = ({
                                                                     onApplyFilters,
                                                                     initialFilters = {},
                                                                     loading: parentLoading, // Rename for clarity
                                                                 }) => {
    const [form] = Form.useForm();
    const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMappingInfo> | null>(null);
    const [loadingMappings, setLoadingMappings] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // Internal submitting state for the form button

    // Ref for focusing the newly added field selector
    const newFieldSelectRef = useRef<any>(null);
    const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);

    useEffect(() => {
        if (newFieldSelectRef.current && lastAddedIndex !== null) {
            newFieldSelectRef.current.focus();
            setLastAddedIndex(null); // Reset after focus
        }
    }, [lastAddedIndex]);


    useEffect(() => { /* fetchMappings remains the same */
        const fetchMappings = async () => {
            setLoadingMappings(true);
            try {
                const mappingResult = await ElasticService.getMapping();
                if (mappingResult && mappingResult.length > 0 && typeof mappingResult[0] === 'object') {
                    setFieldMappings(mappingResult[0]);
                } else {
                    sonnerToast.error('No valid field mappings found.'); setFieldMappings({});
                }
            } catch (e) {
                sonnerToast.error('Error fetching field mappings'); console.error("Error fetching mappings: ", e); setFieldMappings({});
            } finally { setLoadingMappings(false); }
        };
        fetchMappings();
    }, []);

    useEffect(() => { /* initialFilters effect remains similar */
        if (loadingMappings) return;
        const preparedInitialFilters = initialFilters.additionalFilters?.map(af => {
            const fieldType = fieldMappings && af.field ? fieldMappings[af.field]?.type : undefined;
            if (fieldType === 'ip') {
                const ipValue = (typeof af.value === 'object' && af.value !== null) ? af.value : {};
                return { field: af.field, value: { from: (ipValue as any).from, to: (ipValue as any).to } };
            }
            if (fieldType === 'date' && Array.isArray(af.value)) {
                return { field: af.field, value: [af.value[0] ? dayjs(af.value[0]) : null, af.value[1] ? dayjs(af.value[1]) : null]};
            }
            return af;
        }) || []; // Start with empty array if no initial, add button will handle first item
        form.setFieldsValue({ additionalFilters: preparedInitialFilters.length > 0 ? preparedInitialFilters : [{field: undefined, value: undefined}] });
    }, [initialFilters, form, fieldMappings, loadingMappings]);

    const handleSubmit = async (values: any) => {
        setIsSubmitting(true);
        // console.log("FORM SUBMITTED VALUES:", JSON.stringify(values));
        const filtersToApply: GlobalFilterState = {
            additionalFilters: values.additionalFilters
                ?.map((af: any) => { /* ... submit logic from previous working version ... */
                    let valueToStore = af.value;
                    const currentField = af.field;
                    const fieldType = currentField && fieldMappings ? fieldMappings[currentField]?.type : undefined;

                    if (fieldType === 'ip') {
                        const fromVal = valueToStore?.from?.trim();
                        const toVal = valueToStore?.to?.trim();
                        if (!fromVal && !toVal) return null;
                        valueToStore = { from: fromVal || undefined, to: toVal || undefined };
                    }
                    return { field: currentField, value: valueToStore };
                })
                .filter((af: DynamicFilterItem | null): af is DynamicFilterItem => {
                    if (!af || !af.field) return false;
                    const currentField = af.field;
                    const fieldType = fieldMappings?.[currentField]?.type;
                    if (fieldType === 'ip') {
                        const ipValue = af.value as { from?: string; to?: string };
                        return !!(ipValue?.from || ipValue?.to);
                    }
                    if (fieldType === 'date') {
                        return Array.isArray(af.value) && (af.value[0] !== null || af.value[1] !== null);
                    }
                    return af.value !== undefined && af.value !== null && String(af.value).trim() !== '';
                }) || undefined,
        };
        // console.log("FILTERS TO APPLY:", JSON.stringify(filtersToApply));
        onApplyFilters(filtersToApply);
        message.success('Filters applied!', 2); // AntD message
        // Simulate submission time if needed, or rely on parentLoading
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network
        setIsSubmitting(false);
    };

    const handleReset = () => {
        form.resetFields();
        form.setFieldsValue({ additionalFilters: [{ field: undefined, value: undefined }] }); // Ensure one row remains
        onApplyFilters({ additionalFilters: undefined });
        message.info('Filters reset.', 2);
    };

    const renderFilterValueInput = (fieldType: string | undefined) => { /* ... same as your working version ... */
        if (!fieldType) return <Input placeholder="Select a field first" disabled />;
        switch (fieldType.toLowerCase()) {
            case 'date': return <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />;
            case 'ip':
                return (
                    <Space.Compact style={{ width: '100%' }}>
                        <Form.Item name="from" noStyle><Input placeholder="From IP" style={{ width: '50%' }} allowClear /></Form.Item>
                        <Form.Item name="to" noStyle><Input placeholder="To IP" style={{ width: '50%' }} allowClear /></Form.Item>
                    </Space.Compact>
                );
            case 'long': case 'integer': case 'short': case 'byte': case 'double': case 'float': case 'scaled_float':
                return <InputNumber placeholder="Enter number" style={{ width: '100%' }} />;
            case 'boolean':
                return (<Select placeholder="Select boolean" style={{ width: '100%' }} allowClear><Option value={true}>True</Option><Option value={false}>False</Option></Select>);
            default: return <Input placeholder="Enter value" style={{ width: '100%' }} allowClear />;
        }
    };

    if (loadingMappings) return <Spin tip="Loading filter options..." style={{ display: 'block', margin: '20px auto' }} />;
    // Show alert but still render form if fieldMappings is empty, so user can understand.
    // The Select for fields will just be empty.

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            // Removed style from here, apply it on the Card in parent if needed
        >
            {!loadingMappings && (!fieldMappings || Object.keys(fieldMappings).length === 0) && (
                <Alert message="No Fields Available" description="Could not load field definitions for filtering, or no filterable fields found." type="warning" showIcon style={{marginBottom: '16px'}} />
            )}
            <Title level={5} style={{ marginBottom: '16px', color: '#555' }}>Build Your Query:</Title>
            <Form.List name="additionalFilters" initialValue={[{ field: undefined, value: undefined }]}>
                {(fields, { add, remove }, { errors }) => (
                    <>
                        {fields.map(({ key, name, ...restField }, index) => {
                            const selectedFieldKey = form.getFieldValue(['additionalFilters', name, 'field']);
                            const fieldType = selectedFieldKey && fieldMappings && fieldMappings[selectedFieldKey]
                                ? fieldMappings[selectedFieldKey].type
                                : undefined;
                            return (
                                <Row key={key} gutter={8} align="middle" style={{ marginBottom: fields.length > 1 ? 8 : 0 /* No margin for last item if only one */ }}>
                                    <Col flex="200px"> {/* Fixed width for field selector */}
                                        <Form.Item
                                            {...restField} name={[name, 'field']}
                                            rules={[{ required: true, message: 'Field?' }]}
                                            style={{ marginBottom: 0 }} // Remove bottom margin from Form.Item itself
                                        >
                                            <Select
                                                ref={index === fields.length -1 && fields[fields.length-1]?.field === undefined ? newFieldSelectRef : null} // Focus newly added empty field
                                                placeholder="Select Field" allowClear showSearch
                                                filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
                                                onChange={(newlySelectedFieldKeyForThisRow) => { /* ... same logic ... */
                                                    const newlySelectedFieldType = newlySelectedFieldKeyForThisRow && fieldMappings && fieldMappings[newlySelectedFieldKeyForThisRow] ? fieldMappings[newlySelectedFieldKeyForThisRow].type : undefined;
                                                    const allAdditionalFilters = form.getFieldValue('additionalFilters');
                                                    const currentItem = allAdditionalFilters[name];
                                                    currentItem.value = (newlySelectedFieldType === 'ip') ? { from: undefined, to: undefined } : undefined;
                                                    form.setFieldsValue({ additionalFilters: allAdditionalFilters });
                                                    setTimeout(() => {form.validateFields([['additionalFilters', name, 'value']]).catch(()=>{});}, 0);
                                                }}
                                            >
                                                {fieldMappings && Object.entries(fieldMappings)
                                                    .filter(([, mi]) => mi.type !== 'object' && mi.type !== 'nested')
                                                    .sort(([kA], [kB]) => kA.localeCompare(kB))
                                                    .map(([fName]) => (<Option key={fName} value={fName} label={fName}>{fName}</Option>))}
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col flex="auto"> {/* Value input takes remaining space */}
                                        <Form.Item
                                            {...restField} name={[name, 'value']}
                                            shouldUpdate={(pv, cv) => pv.additionalFilters?.[name]?.field !== cv.additionalFilters?.[name]?.field }
                                            rules={[{ /* ... same validator ... */
                                                validator: async (_, formItemValue) => {
                                                    const fieldKeyForRow = form.getFieldValue(['additionalFilters', name, 'field']);
                                                    const actualFieldType = fieldKeyForRow && fieldMappings && fieldMappings[fieldKeyForRow] ? fieldMappings[fieldKeyForRow].type : undefined;
                                                    if (!fieldKeyForRow && formItemValue === undefined) {
                                                        if (actualFieldType === 'ip' && JSON.stringify(formItemValue) === JSON.stringify({ from: undefined, to: undefined })) return Promise.resolve();
                                                        if (formItemValue === undefined) return Promise.resolve();
                                                    }
                                                    if (actualFieldType === 'ip') {
                                                        if (typeof formItemValue !== 'object' || formItemValue === null || (!formItemValue.from?.trim() && !formItemValue.to?.trim())) return Promise.reject(new Error('IP From/To?'));
                                                    } else if (actualFieldType === 'date') {
                                                        if (!formItemValue || !Array.isArray(formItemValue) || (formItemValue[0] === null && formItemValue[1] === null)) return Promise.reject(new Error('Date range?'));
                                                    } else {
                                                        if (formItemValue === undefined || formItemValue === null || String(formItemValue).trim() === '') {
                                                            if (fieldKeyForRow) return Promise.reject(new Error('Value?'));
                                                        }
                                                    }
                                                    return Promise.resolve();
                                                }
                                            }]}
                                            style={{ marginBottom: 0 }}
                                        >
                                            {renderFilterValueInput(fieldType)}
                                        </Form.Item>
                                    </Col>
                                    <Col flex="32px"> {/* Fixed width for remove button */}
                                        {fields.length > 1 && ( // Only show remove button if more than one filter
                                            <Button danger type="text" icon={<MinusCircleOutlined />} onClick={() => remove(name)} style={{border: 'none'}} />
                                        )}
                                    </Col>
                                </Row>
                            );
                        })}
                        <Form.Item style={{marginTop: fields.length > 0 ? '12px' : '0px' /* Add margin if there are fields */}}>
                            <Button type="dashed" onClick={() => { add({ field: undefined, value: undefined }); setLastAddedIndex(fields.length);}} block icon={<PlusOutlined />}>
                                Add Filter Condition
                            </Button>
                            <Form.ErrorList errors={errors} />
                        </Form.Item>
                    </>
                )}
            </Form.List>
            <Divider style={{margin: '20px 0'}}/> {/* Visual separator */}
            <Row>
                <Col span={24} style={{ textAlign: 'right' }}>
                    <Space>
                        <Button icon={<ClearOutlined />} onClick={handleReset} disabled={isSubmitting || parentLoading}>
                            Reset All
                        </Button>
                        <Button type="primary" icon={<SearchOutlined />} htmlType="submit" loading={isSubmitting || parentLoading}>
                            Apply & Search
                        </Button>
                    </Space>
                </Col>
            </Row>
        </Form>
    );
};
export default GlobalLogFilterForm;