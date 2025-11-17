import { Form, useActionData, useNavigation } from 'react-router-dom'
import { TextInput, PasswordInput, Button, Title, Paper, Text, Flex } from '@mantine/core'

function Login() {
    const actionData = useActionData()
    const navigation = useNavigation()

    return (
        <Flex justify="center" align="center" style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-gray-light)' }}>
            <Paper shadow="md" p="xl" radius="md" style={{ width: '100%', maxWidth: 400 }}>
                <Title order={2} align="center" mb="md">
                    SAFFRON
                </Title>
                <Form method="post">
                    <TextInput
                        label="Username"
                        placeholder="Your username"
                        name="username"
                        required
                        size="sm"
                    />
                    <PasswordInput
                        label="Password"
                        placeholder="Your password"
                        name="password"
                        required
                        mt="md"
                        size="sm"
                    />
                    {actionData?.error && (
                        <Text c="red" size="sm" mt="sm">
                            {actionData.error}
                        </Text>
                    )}
                    <Button
                        fullWidth
                        mt="xl"
                        type="submit"
                        loading={navigation.state === 'submitting'}
                        size="sm"
                    >
                        {navigation.state === 'submitting' ? 'Logging in...' : 'Login'}
                    </Button>
                </Form>
            </Paper>
        </Flex>
    )
}

export default Login
