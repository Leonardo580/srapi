// src/components/GlobalLogFilterForm.tsx
import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, DatePicker, Row, Col, Space, Spin, InputNumber, Alert } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { GlobalFilterState, DynamicFilterItem } from './LogsTable'; // Adjust path
import type { FieldMappingInfo } from '@/utils/mappingHelper'; // Adjust path
import ElasticService from '@/api/services/elasticService';
import { toast } from 'sonner';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface GlobalLogFilterFormProps {
    onApplyFilters: (filters: GlobalFilterState) => void;
    initialFilters?: GlobalFilterState;
    loading?: boolean;
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
        const fetchMappings = async () => {
            setLoadingMappings(true);
            try {
                const mappingResult = await ElasticService.getMapping();
                if (mappingResult && mappingResult.length > 0 && typeof mappingResult[0] === 'object') {
                    setFieldMappings(mappingResult[0]);
                } else {
                    toast.error('No valid field mappings found or mapping format incorrect.');
                    setFieldMappings({});
                }
            } catch (e) {
                toast.error('Error fetching field mappings');
                console.error("Error fetching mappings: ", e);
                setFieldMappings({});
            } finally {
                setLoadingMappings(false);
            }
        };
        fetchMappings();
    }, []);

    useEffect(() => {
        if (loadingMappings) return;

        const preparedInitialFilters = initialFilters.additionalFilters?.map(af => {
            const fieldType = fieldMappings && af.field ? fieldMappings[af.field]?.type : undefined;
            if (fieldType === 'ip') {
                const ipValue = (typeof af.value === 'object' && af.value !== null) ? af.value : {};
                return { field: af.field, value: { from: (ipValue as any).from, to: (ipValue as any).to } };
            }
            // Ensure date ranges are dayjs objects if they come from initialFilters as strings/timestamps
            if (fieldType === 'date' && Array.isArray(af.value)) {
                return {
                    field: af.field,
                    value: [
                        af.value[0] ? dayjs(af.value[0]) : null,
                        af.value[1] ? dayjs(af.value[1]) : null,
                    ]
                };
            }
            return af;
        }) || [{ field: undefined, value: undefined }];

        form.setFieldsValue({ additionalFilters: preparedInitialFilters });
        // console.log("FORM SET WITH INITIAL FILTERS (useEffect):", JSON.stringify(preparedInitialFilters));

    }, [initialFilters, form, fieldMappings, loadingMappings]);

    const handleSubmit = (values: any) => {
        // console.log("FORM SUBMITTED VALUES:", JSON.stringify(values));
        const filtersToApply: GlobalFilterState = {
            additionalFilters: values.additionalFilters
                ?.map((af: any) => {
                    let valueToStore = af.value; // For IP, this will be {from, to}. For Date, [dayjs,dayjs]
                    const currentField = af.field;
                    const fieldType = currentField && fieldMappings ? fieldMappings[currentField]?.type : undefined;

                    if (fieldType === 'ip') {
                        // Value is already {from, to} from the form
                        const fromVal = valueToStore?.from?.trim();
                        const toVal = valueToStore?.to?.trim();
                        if (!fromVal && !toVal) return null; // No valid IP bounds
                        // Keep the structure {from, to} for processing in useLogsData
                        valueToStore = { from: fromVal || undefined, to: toVal || undefined };
                    }
                    // For date, valueToStore is already [Dayjs|null, Dayjs|null] from RangePicker
                    // For other types, valueToStore is the direct value

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
    };

    const handleReset = () => {
        form.resetFields();
        form.setFieldsValue({ additionalFilters: [{ field: undefined, value: undefined }] });
        onApplyFilters({ additionalFilters: undefined });
        // console.log("FORM RESET");
    };

    // This function now only returns the raw input components, not Form.Item wrappers
    const renderFilterValueInputControls = (fieldType: string | undefined) => {
        if (!fieldType) return <Input placeholder="Select a field first" disabled />;
        switch (fieldType.toLowerCase()) {
            case 'date':
                return <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />;
            // IP case is handled by specific Form.Items directly in the Form.List map
            case 'long': case 'integer': case 'short': case 'byte': case 'double': case 'float': case 'scaled_float':
                return <InputNumber placeholder="Enter number" style={{ width: '100%' }} />;
            case 'boolean':
                return (
                    <Select placeholder="Select boolean" style={{ width: '100%' }} allowClear>
                        <Option value={true}>True</Option>
                        <Option value={false}>False</Option>
                    </Select>
                );
            default: // For text, keyword (non-IP), etc.
                return <Input placeholder="Enter value" style={{ width: '100%' }} allowClear />;
        }
    };

    if (loadingMappings) {
        return <Spin tip="Loading filter options..." style={{ display: 'block', margin: '20px auto' }} />;
    }
    if (!fieldMappings || Object.keys(fieldMappings).length === 0 && !loadingMappings) {
        return <Alert message="Warning" description="Field mappings could not be loaded or are empty." type="warning" showIcon style={{marginBottom: '16px'}} />;
    }

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '16px' }}
        >
            <h3 style={{ marginBottom: '10px' }}>Add Filters:</h3>
            <Form.List name="additionalFilters" initialValue={[{ field: undefined, value: undefined }]}>
                {(fields, { add, remove }, { errors }) => (
                    <>
                        {fields.map(({ key, name, ...restField }, index) => {
                            // `name` is the numerical index from Form.List (e.g., 0, 1)
                            const selectedFieldKey = form.getFieldValue(['additionalFilters', name, 'field']);
                            const fieldType = selectedFieldKey && fieldMappings && fieldMappings[selectedFieldKey]
                                ? fieldMappings[selectedFieldKey].type
                                : undefined;

                            return (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'field']}
                                        rules={[{ required: true, message: 'Field is required' }]}
                                        style={{ minWidth: '200px' }}
                                    >
                                        <Select
                                            placeholder="Select Field" allowClear showSearch
                                            filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}
                                            onChange={(newlySelectedFieldKeyForThisRow) => {
                                                const newlySelectedFieldType = newlySelectedFieldKeyForThisRow && fieldMappings && fieldMappings[newlySelectedFieldKeyForThisRow]
                                                    ? fieldMappings[newlySelectedFieldKeyForThisRow].type
                                                    : undefined;
                                                const allAdditionalFilters = form.getFieldValue('additionalFilters');
                                                const currentItem = allAdditionalFilters[name];

                                                if (newlySelectedFieldType === 'ip') {
                                                    currentItem.value = { from: undefined, to: undefined };
                                                } else {
                                                    currentItem.value = undefined;
                                                }
                                                form.setFieldsValue({ additionalFilters: allAdditionalFilters });
                                                // Trigger validation for the value field of this row
                                                setTimeout(() => {form.validateFields([['additionalFilters', name, 'value']]).catch(()=>{});}, 0);
                                            }}
                                        >
                                            {fieldMappings && Object.entries(fieldMappings)
                                                .filter(([, mi]) => mi.type !== 'object' && mi.type !== 'nested')
                                                .sort(([kA], [kB]) => kA.localeCompare(kB))
                                                .map(([fName]) => (<Option key={fName} value={fName} label={fName}>{fName}</Option>))}
                                        </Select>
                                    </Form.Item>

                                    {/* CONDITIONAL RENDERING FOR VALUE INPUTS */}
                                    {fieldType === 'ip' ? (
                                        <React.Fragment>
                                            <Form.Item
                                                // {...restField} // Not needed for sub-fields like this typically
                                                name={[name, 'value', 'from']} // Path: additionalFilters[name].value.from
                                                style={{ flexGrow: 1, minWidth: '120px', marginRight: '8px' }}
                                                rules={[{ // Rule attached to the 'from' field
                                                    validator: async (_, fromValue) => {
                                                        const toValue = form.getFieldValue(['additionalFilters', name, 'value', 'to']);
                                                        if (!fromValue?.trim() && !toValue?.trim()) {
                                                            // This individual validation might be overridden by the parent object's validator
                                                            // It's okay to have it for immediate feedback on the input
                                                        }
                                                        return Promise.resolve();
                                                    }
                                                }]}
                                            >
                                                <Input placeholder="From IP" allowClear />
                                            </Form.Item>
                                            <Form.Item
                                                // {...restField}
                                                name={[name, 'value', 'to']} // Path: additionalFilters[name].value.to
                                                style={{ flexGrow: 1, minWidth: '120px' }}
                                                rules={[{ // Rule attached to the 'to' field
                                                    validator: async (_, toValue) => {
                                                        const fromValue = form.getFieldValue(['additionalFilters', name, 'value', 'from']);
                                                        if (!fromValue?.trim() && !toValue?.trim()) {
                                                            // See comment above
                                                        }
                                                        return Promise.resolve();
                                                    }
                                                }]}
                                            >
                                                <Input placeholder="To IP" allowClear />
                                            </Form.Item>
                                            {/* Hidden Form.Item to validate the entire IP value object */}
                                            <Form.Item
                                                name={[name, 'value']} // Validates additionalFilters[name].value
                                                noStyle // Make it hidden
                                                rules={[{
                                                    validator: async (_, ipValueObject) => { // ipValueObject is {from, to}
                                                        // console.log(`IP PARENT VALIDATOR for row ${name}:`, ipValueObject);
                                                        if (typeof ipValueObject !== 'object' || ipValueObject === null) {
                                                            // This should ideally not happen if Select onChange sets it to {}
                                                            return Promise.reject(new Error('IP structure error'));
                                                        }
                                                        if (!ipValueObject.from?.trim() && !ipValueObject.to?.trim()) {
                                                            return Promise.reject(new Error('At least one IP bound is required'));
                                                        }
                                                        return Promise.resolve();
                                                    }
                                                }]}
                                            >
                                                <Input style={{ display: 'none' }} />{/* Dummy input */}
                                            </Form.Item>
                                        </React.Fragment>
                                    ) : (
                                        // For non-IP types, use a single Form.Item for the value
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'value']}
                                            shouldUpdate={(prevValues, currentValues) =>
                                                prevValues.additionalFilters?.[name]?.field !== currentValues.additionalFilters?.[name]?.field
                                            }
                                            rules={[{
                                                validator: async (_, formItemValue) => {
                                                    const fieldKeyForRow = form.getFieldValue(['additionalFilters', name, 'field']);
                                                    const actualFieldType = fieldKeyForRow && fieldMappings && fieldMappings[fieldKeyForRow] ? fieldMappings[fieldKeyForRow].type : undefined;
                                                    // console.log(`VALIDATOR (non-IP) for row ${name}: Field='${fieldKeyForRow}', Type='${actualFieldType}', Value='${JSON.stringify(formItemValue)}'`);
                                                    if (!fieldKeyForRow && formItemValue === undefined) return Promise.resolve();

                                                    if (actualFieldType === 'date') {
                                                        if (!formItemValue || !Array.isArray(formItemValue) || (formItemValue[0] === null && formItemValue[1] === null)) {
                                                            return Promise.reject(new Error('Date range is required'));
                                                        }
                                                    } else { // For other simple types (boolean, number, text, keyword)
                                                        if (formItemValue === undefined || formItemValue === null || String(formItemValue).trim() === '') {
                                                            if (fieldKeyForRow) return Promise.reject(new Error('Value is required'));
                                                        }
                                                    }
                                                    return Promise.resolve();
                                                }
                                            }]}
                                            style={{ flexGrow: 1, minWidth: '250px' }}
                                        >
                                            {renderFilterValueInputControls(fieldType)}
                                        </Form.Item>
                                    )}
                                    <MinusCircleOutlined onClick={() => remove(name)} />
                                </Space>
                            );
                        })}
                        <Form.Item>
                            <Button type="dashed" onClick={() => add({ field: undefined, value: undefined })} block icon={<PlusOutlined />}>Add Filter</Button>
                            <Form.ErrorList errors={errors} />
                        </Form.Item>
                    </>
                )}
            </Form.List>
            <Row style={{ marginTop: '24px' }}>
                <Col span={24} style={{ textAlign: 'right' }}>
                    <Space><Button onClick={handleReset} disabled={submitLoading}>Reset Filters</Button><Button type="primary" htmlType="submit" loading={submitLoading}>Apply Filters</Button></Space>
                </Col>
            </Row>
            {/* <Button htmlType="button" onClick={() => console.log("MANUAL LOG FORM VALUES:", form.getFieldsValue())}>Log Form Values</Button> */}
        </Form>
    );
};

export default GlobalLogFilterForm;