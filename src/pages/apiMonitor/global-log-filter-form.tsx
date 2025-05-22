// src/components/GlobalLogFilterForm.tsx
import React from 'react';
import { Form, Input, Button, Select, DatePicker, Row, Col, Space } from 'antd';
import type { GlobalFilterState } from './LogsTable'; // Assuming you place GlobalFilterState in LogsTable or a shared types file
import type dayjs from 'dayjs';

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
                                                                     loading,
                                                                 }) => {
    const [form] = Form.useForm();

    const handleSubmit = (values: any) => {
        const filters: GlobalFilterState = {
            mainSearch: values.mainSearch || undefined,
            level: values.level || undefined,
            timestampRange: values.timestampRange || undefined,
        };
        onApplyFilters(filters);
    };

    const handleReset = () => {
        form.resetFields();
        onApplyFilters({}); // Apply empty filters to reset
    };

    return (
        <Form
            form={form}
    layout="vertical"
    onFinish={handleSubmit}
    initialValues={{
        mainSearch: initialFilters.mainSearch,
            level: initialFilters.level,
            timestampRange: initialFilters.timestampRange,
    }}
    style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '16px' }}
>
    <Row gutter={16}>
    <Col xs={24} sm={12} md={8}>
    <Form.Item name="mainSearch" label="Keyword Search">
    <Input placeholder="Search logs (e.g., in message)" allowClear />
    </Form.Item>
    </Col>
    <Col xs={24} sm={12} md={8}>
    <Form.Item name="level" label="Log Level">
    <Select placeholder="Select level" allowClear>
    <Option value="error">Error</Option>
        <Option value="warn">Warn</Option>
        <Option value="info">Info</Option>
        <Option value="debug">Debug</Option>
    {/* Add other levels if needed */}
    </Select>
    </Form.Item>
    </Col>
    <Col xs={24} sm={24} md={8}>
    <Form.Item name="timestampRange" label="Date Range">
    <RangePicker
        showTime={{ format: 'HH:mm' }}
    format="YYYY-MM-DD HH:mm"
    style={{ width: '100%' }}
    />
    </Form.Item>
    </Col>
    </Row>
    <Row>
    <Col span={24} style={{ textAlign: 'right' }}>
    <Space>
        <Button onClick={handleReset} disabled={loading}>
        Reset
        </Button>
        <Button type="primary" htmlType="submit" loading={loading}>
        Apply Filters
    </Button>
    </Space>
    </Col>
    </Row>
    </Form>
);
};

export default GlobalLogFilterForm;