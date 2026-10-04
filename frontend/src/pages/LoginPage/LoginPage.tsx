import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { login as apiLogin } from '@client/src/api';
import { useAuth } from '@client/src/context/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login: setLoggedIn } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (values: { phone: string; password: string }): Promise<void> => {
    setLoading(true);
    try {
      const result = await apiLogin({
        phone: values.phone.trim(),
        password: values.password,
      });
      setLoggedIn(result.user, result.token);
      message.success('登录成功');
      navigate('/');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '登录失败，请检查手机号或密码');
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
            欢迎回来
          </Typography.Title>
          <Typography.Text type="secondary">登录您的账号继续使用</Typography.Text>
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
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" size="large" autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Typography.Text type="secondary">
            没有账号？{' '}
            <Link to="/register" style={{ fontWeight: 500 }}>
              去注册
            </Link>
          </Typography.Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
