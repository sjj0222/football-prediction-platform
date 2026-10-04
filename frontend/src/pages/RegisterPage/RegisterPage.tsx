import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { register } from '@client/src/api';

interface RegisterFormValues {
  phone: string;
  password: string;
  confirmPassword: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (values: RegisterFormValues): Promise<void> => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await register({
        phone: values.phone.trim(),
        password: values.password,
      });
      message.success('注册成功，请登录');
      navigate('/login');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        padding: 16,
      }}
    >
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            创建账号
          </Typography.Title>
          <Typography.Text type="secondary">注册一个新的账号</Typography.Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^[0-9+\-() ]{6,20}$/, message: '手机号格式不正确' },
            ]}
          >
            <Input placeholder="请输入手机号" size="large" autoComplete="username" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度不能少于 6 位' },
              {
                pattern: /^(?=.*[a-zA-Z])(?=.*\d).+$/,
                message: '密码必须包含字母和数字',
              },
            ]}
          >
            <Input.Password
              placeholder="至少 6 位，含字母和数字"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            label="确认密码"
            name="confirmPassword"
            rules={[{ required: true, message: '请再次输入密码' }]}
          >
            <Input.Password placeholder="请再次输入密码" size="large" autoComplete="new-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            {loading ? '注册中...' : '注册'}
          </Button>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Typography.Text type="secondary">
            已有账号？{' '}
            <Link to="/login" style={{ fontWeight: 500 }}>
              去登录
            </Link>
          </Typography.Text>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
