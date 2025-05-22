// src/components/GlobalLogFilterForm.tsx
import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, DatePicker, Row, Col, Space, Spin, InputNumber } from 'antd'; // Added InputNumber
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { GlobalFilterState, DynamicFilterItem } from './LogsTable'; // Adjust path
import type { FieldMappingInfo } from '@/utils/mappingHelper';
import ElasticService from '@/api/services/elasticService';
import { toast } from 'sonner';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface GlobalLogFilterFormProps {
    onApplyFilters: (filters: GlobalFilterState) => void;
    initialFilters?: GlobalFilterState;
    loading?: boolean; // For the submit button
}

const GlobalLogFilterForm: React.FC<GlobalLogFilterFormProps> = ({
                                                                     onApplyFilters,
                                                                     initialFilters = {},
                                                                     loading: submitLoading,
                                                                 }) => {
    const [form] = Form.useForm();
    const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMappingInfo> | null>(null);
    const [loadingMappings, setLoadingMappings] = useState(true);

    useEffect(() => {
        // ... (fetchMappings useEffect remains the same) ...
        const fetchMappings = async () => {
            setLoadingMappings(true);
            try {
                const mappingResult = await ElasticService.getMapping();
                if (mappingResult && mappingResult.length > 0) {
                    setFieldMappings(mappingResult[0]);
                } else {
                    toast.error('No field mappings found.');
                    setFieldMappings({});
                }
            } catch (e) {
                toast.error('Error fetching field mappings for filters');
                console.error("Error fetching mappings: ", e);
                setFieldMappings({});
            } finally {
                setLoadingMappings(false);
            }
        };
        fetchMappings();
    }, []);

    const handleSubmit = (values: any) => {
        const filtersToApply: GlobalFilterState = {
            mainSearch: values.mainSearch?.trim() || undefined,
            level: values.level || undefined,
            timestampRange: values.timestampRange || undefined,
            additionalFilters: values.additionalFilters
                ?.map((af: any) => {
                    let valueToStore = af.value;
                    // For IP ranges, store as an object { from: string, to: string }
                    if (af.field && fieldMappings && fieldMappings[af.field]?.type === 'ip') {
                        valueToStore = { from: af.value?.from, to: af.value?.to };
                        // Ensure at least one is present
                        if (!valueToStore.from && !valueToStore.to) return null;
                    }
                    // For Date ranges, value is already [dayjs | null, dayjs | null]
                    // For other types, value is directly taken

                    return {
                        field: af.field,
                        value: valueToStore,
                    };
                })
                .filter((af: DynamicFilterItem | null) => {
                    if (!af || !af.field) return false;

                    // Custom validation for IP range objects
                    if (af.value && typeof af.value === 'object' && ('from' in af.value || 'to' in af.value) && fieldMappings && fieldMappings[af.field]?.type === 'ip') {
                        return (af.value.from && String(af.value.from).trim() !== '') ||
                            (af.value.to && String(af.value.to).trim() !== '');
                    }
                    // Custom validation for Date range arrays
                    if (Array.isArray(af.value) && fieldMappings && fieldMappings[af.field]?.type === 'date') {
                        return af.value.some(v => v !== null); // At least one date in the range
                    }
                    // General value validation
                    return af.value !== undefined &&
                        af.value !== null &&
                        String(af.value).trim() !== '';
                }) || undefined,
        };
        onApplyFilters(filtersToApply);
    };

    const handleReset = () => {
        form.resetFields();
        onApplyFilters({});
    };

    const renderFilterValueInput = (fieldType: string | undefined, formNamePath: (string | number)[], fieldName: string) => {
        if (!fieldType) return <Input placeholder="Select a field first" disabled />;

        switch (fieldType.toLowerCase()) {
            case 'date':
                // Value for RangePicker is an array [start, end]
                return <RangePicker name={formNamePath} showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />;
            case 'ip':
                // For IP ranges, we use a nested structure in the form
                // The value for 'ip' fields will be an object like { from: '...', to: '...' }
                return (
                    <Space.Compact style={{ width: '100%' }}>
                        <Form.Item name={[...formNamePath, 'from']} noStyle>
                            <Input placeholder="From IP" style={{ width: '50%' }} />
                        </Form.Item>
                        <Form.Item name={[...formNamePath, 'to']} noStyle>
                            <Input placeholder="To IP" style={{ width: '50%' }} />
                        </Form.Item>
                    </Space.Compact>
                );
            case 'long':
            case 'integer':
            case 'short':
            case 'byte':
            case 'double':
            case 'float':
            case 'scaled_float':
                return <InputNumber name={formNamePath} placeholder="Enter number" style={{ width: '100%' }} />;
            case 'boolean':
                return (
                    <Select name={formNamePath} placeholder="Select boolean" style={{ width: '100%' }} allowClear>
                        <Option value={true}>True</Option>
                        <Option value={false}>False</Option>
                    </Select>
                );
            case 'keyword':
            case 'text':
            default:
                return <Input name={formNamePath} placeholder="Enter value" style={{ width: '100%' }} allowClear />;
        }
    };

    if (loadingMappings) {
        return <Spin tip="Loading filter options..." style={{ display: 'block', margin: '20px auto' }} />;
    }

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
                mainSearch: initialFilters.mainSearch,
                level: initialFilters.level,
                timestampRange: initialFilters.timestampRange,
                additionalFilters: initialFilters.additionalFilters?.map(af => {
                    // If fieldMappings is loaded and type is IP, structure initial value for form
                    if (fieldMappings && af.field && fieldMappings[af.field]?.type === 'ip' && typeof af.value === 'object') {
                        return { field: af.field, value: { from: af.value?.from, to: af.value?.to } };
                    }
                    return af; // Otherwise, use value as is (e.g., for date ranges or simple values)
                }) || [{ field: undefined, value: undefined }],
            }}
            style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '16px' }}
        >
            {/* Static Filters ... (remain the same) ... */}


            <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Filters:</h3>
            <Form.List name="additionalFilters">
                {(fields, { add, remove }) => (
                    <>
                        {fields.map(({ key, name, ...restField }, index) => {
                            const selectedFieldKey = form.getFieldValue(['additionalFilters', index, 'field']);
                            const fieldType = selectedFieldKey && fieldMappings ? fieldMappings[selectedFieldKey]?.type : undefined;

                            return (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'field']}
                                        rules={[{ required: true, message: 'Missing field' }]}
                                        style={{ minWidth: '200px' }}
                                    >
                                        <Select
                                            placeholder="Select Field"
                                            allowClear
                                            showSearch
                                            filterOption={(input, option) =>
                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            onChange={() => {
                                                const currentFilters = form.getFieldValue('additionalFilters');
                                                currentFilters[index].value = undefined; // Reset the entire value object/array
                                                form.setFieldsValue({ additionalFilters: currentFilters });
                                            }}
                                        >
                                            {fieldMappings && Object.entries(fieldMappings)
                                                .filter(([fieldName, mappingInfo]) => mappingInfo.type !== 'object' && mappingInfo.type !== 'nested') // Exclude object/nested types
                                                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                                                .map(([fieldName]) => ( // Removed mappingInfo.type from display
                                                    <Option key={fieldName} value={fieldName} label={fieldName}>
                                                        {fieldName}
                                                    </Option>
                                                ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        {...restField}
                                        // For IP, the name points to an object, so value is handled by nested Form.Items
                                        // For others, it's directly [name, 'value']
                                        name={fieldType === 'ip' ? [name, 'value'] : [name, 'value']}
                                        rules={[{
                                            validator: async (_, value) => {
                                                if (fieldType === 'ip') {
                                                    if (!value || (!value.from && !value.to)) {
                                                        return Promise.reject(new Error('At least one IP bound is required'));
                                                    }
                                                } else if (fieldType === 'date') {
                                                    if (!value || (Array.isArray(value) && value.every(v => v === null))) {
                                                        return Promise.reject(new Error('Date range is required'));
                                                    }
                                                } else if (value === undefined || value === null || String(value).trim() === '') {
                                                    return Promise.reject(new Error('Value is required'));
                                                }
                                                return Promise.resolve();
                                            }
                                        }]}
                                        style={{ flexGrow: 1, minWidth: '250px' }}
                                    >
                                        {renderFilterValueInput(fieldType, [name, 'value'], selectedFieldKey)}
                                    </Form.Item>

                                    <MinusCircleOutlined onClick={() => remove(name)} />
                                </Space>
                            );
                        })}
                        <Form.Item>
                            <Button type="dashed" onClick={() => add({ field: undefined, value: undefined })} block icon={<PlusOutlined />}>
                                Add Filter Field
                            </Button>
                        </Form.Item>
                    </>
                )}
            </Form.List>

            {/* Submit/Reset Buttons ... (remain the same) ... */}
            <Row style={{ marginTop: '24px' }}>
                <Col span={24} style={{ textAlign: 'right' }}>
                    <Space>
                        <Button onClick={handleReset} disabled={submitLoading}>
                            Reset All
                        </Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading}>
                            Apply Filters
                        </Button>
                    </Space>
                </Col>
            </Row>
        </Form>
    );
};

export default GlobalLogFilterForm;