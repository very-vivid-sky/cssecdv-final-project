import { useState, useEffect } from 'react'
import { useLoaderData, useActionData, useSubmit, Form } from 'react-router-dom'
import {
    Container,
    Title,
    TextInput,
    PasswordInput,
    Select,
    Button,
    Group,
    Paper,
    Stack,
    Table,
    Text,
    Box,
    Flex,
    Alert,
} from '@mantine/core'

import { modals } from '@mantine/modals'
function UserManagement() {
    const users = useLoaderData()
    const actionData = useActionData()
    const [editingUser, setEditingUser] = useState(null)
    const [showNotification, setShowNotification] = useState(false)
    const submit = useSubmit()

    useEffect(() => {
        if (actionData?.message) {
            setShowNotification(true)
            const timer = setTimeout(() => {
                setShowNotification(false)
            }, 5000)

            return () => clearTimeout(timer)
        }
    }, [actionData])

    const handleSubmit = (event) => {
        event.preventDefault()
        const form = event.currentTarget
        submit(form, { method: 'post' })
        setEditingUser(null)
        if (actionData?.success) {
            form.reset()
        }
    }
    const openDeleteModal = (userId) => {
        modals.openConfirmModal({
            title: 'Delete user',
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to delete this user? This action cannot be undone.
                </Text>
            ),
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: () => {
                const form = document.createElement('form')
                form.method = 'post'
                form.appendChild(createHiddenInput('_action', 'delete'))
                form.appendChild(createHiddenInput('id', userId))
                submit(form)
            },
        })
    }

    const createHiddenInput = (name, value) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = name
        input.value = value
        return input
    }

    return (
        <Container size="lg">
            <Paper shadow="xs" p="md" mb="xl" withBorder>
                <Title order={3} mb="md">{editingUser ? 'Edit User' : 'Create User'}</Title>
                <Form method="post" onSubmit={handleSubmit}>
                    <input type="hidden" name="_action" value={editingUser ? 'update' : 'create'} />
                    {editingUser && <input type="hidden" name="id" value={editingUser.id} />}

                    {showNotification && (
                        <Alert
                            title={actionData.success ? 'Success' : 'Error'}
                            color={actionData.success ? 'green' : 'red'}
                            mb="md"
                            withCloseButton={true}
                            onClose={() => setShowNotification(false)}
                        >
                            {actionData.message}
                        </Alert>
                    )}
                    <Stack gap="md">
                        <TextInput
                            name="username"
                            label="Username"
                            placeholder="Enter username"
                            defaultValue={editingUser?.username}
                            required
                            error={actionData?.error?.username}
                        />
                        <PasswordInput
                            name="password"
                            label="Password"
                            placeholder="Enter password"
                            required={!editingUser}
                            error={actionData?.error?.password}

                        />
                        <Select
                            name="role"
                            label="Role"
                            defaultValue={editingUser?.role || 'cashier'}
                            data={[
                                { value: 'cashier', label: 'Cashier' },
                                { value: 'manager', label: 'Manager' },
                            ]}
                            error={actionData?.error?.role}

                        />

                        <Group justify="flex-end">
                            {editingUser && (
                                <Button variant="light" onClick={() => setEditingUser(null)}>
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit">{editingUser ? 'Update' : 'Create'}</Button>
                        </Group>
                    </Stack>
                </Form>
            </Paper>
            <Box mb="xl">
                <Title order={3} mb="md">User List</Title>
                <Table.ScrollContainer minWidth={500}>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Username</Table.Th>
                                <Table.Th>Role</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {users.map(user => (
                                <Table.Tr key={user.id}>
                                    <Table.Td>{user.username}</Table.Td>
                                    <Table.Td>{user.role}</Table.Td>
                                    <Table.Td>
                                        <Flex gap="xs">
                                            <Button size="compact-xs" onClick={() => setEditingUser(user)}>
                                                Edit
                                            </Button>
                                            <Button size="compact-xs" color="red" onClick={() => openDeleteModal(user.id)}>
                                                Delete
                                            </Button>
                                        </Flex>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Box>
        </Container>
    )
}

export default UserManagement
