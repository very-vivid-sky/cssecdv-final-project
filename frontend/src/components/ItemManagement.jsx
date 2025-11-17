import { useState, useEffect } from 'react'
import { useLoaderData, useActionData, useSubmit, Form } from 'react-router-dom'
import {
    Container,
    Title,
    TextInput,
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
    NumberInput,
} from '@mantine/core'

import { modals } from '@mantine/modals'

function ItemManagement() {
    const items = useLoaderData()
    const actionData = useActionData()
    const [editingItem, setEditingItem] = useState(null)
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
        setEditingItem(null)
        if (actionData?.success) {
            form.reset()
        }
    }

    const openDeleteModal = (itemId) => {
        modals.openConfirmModal({
            title: 'Delete Item',
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to delete this menu item? This action cannot be undone.
                </Text>
            ),
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: () => {
                const form = document.createElement('form')
                form.method = 'post'
                form.appendChild(createHiddenInput('_action', 'delete'))
                form.appendChild(createHiddenInput('id', itemId))
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
                <Title order={3} mb="md">{editingItem ? 'Edit Item' : 'Create Item'}</Title>
                <Form method="post" onSubmit={handleSubmit}>
                    <input type="hidden" name="_action" value={editingItem ? 'update' : 'create'} />
                    {editingItem && <input type="hidden" name="id" value={editingItem.id} />}

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
                        <Select
                            name="type"
                            label="Type"
                            defaultValue={editingItem?.type || 'Sandwiches'}
                            data={[
                                { value: 'Sandwiches', label: 'Sandwiches' },
                                { value: 'Platters', label: 'Platters' },
                                { value: 'Appetizers', label: 'Appetizers' },
                                { value: 'Mains', label: 'Mains' },
                                { value: 'Drinks', label: 'Drinks' },
                            ]}
                            error={actionData?.error?.type}
                            required
                        />
                        <TextInput
                            name="item"
                            label="Item Name"
                            placeholder="Enter item name"
                            defaultValue={editingItem?.item}
                            required
                            error={actionData?.error?.item}
                        />
                        <NumberInput
                            name="price"
                            label="Price"
                            placeholder="Enter price"
                            defaultValue={editingItem?.price}
                            required
                            min={0}
                            error={actionData?.error?.price}
                        />

                        <Group justify="flex-end">
                            {editingItem && (
                                <Button variant="light" onClick={() => setEditingItem(null)}>
                                    Cancel
                                </Button>
                            )}
                            <Button type="submit">{editingItem ? 'Update' : 'Create'}</Button>
                        </Group>
                    </Stack>
                </Form>
            </Paper>
            <Box mb="xl">
                <Title order={3} mb="md">Menu Items</Title>
                <Table.ScrollContainer minWidth={500}>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Item Name</Table.Th>
                                <Table.Th>Price</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {items.map(item => (
                                <Table.Tr key={item.id}>
                                    <Table.Td>{item.type}</Table.Td>
                                    <Table.Td>{item.item}</Table.Td>
                                    <Table.Td>{item.price}</Table.Td>
                                    <Table.Td>
                                        <Flex gap="xs">
                                            <Button size="compact-xs" onClick={() => setEditingItem(item)}>
                                                Edit
                                            </Button>
                                            <Button size="compact-xs" color="red" onClick={() => openDeleteModal(item.id)}>
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

export default ItemManagement
