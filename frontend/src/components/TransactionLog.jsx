import { useState } from 'react'
import { useLoaderData, useSubmit } from 'react-router-dom'
import {
    Table,
    Group,
    Button,
    Text,
    Paper,
    Modal,
    TextInput,
    Select,
    Stack,
    Badge,
    Box,
    Collapse,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'

export default function TransactionLog() {
    const transactions = useLoaderData()
    const submit = useSubmit()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTransaction, setSelectedTransaction] = useState(null)
    const [opened, { open, close }] = useDisclosure(false)
    const [expandedRows, setExpandedRows] = useState(new Set())

    const toggleRow = (id) => {
        const newExpandedRows = new Set(expandedRows)
        if (newExpandedRows.has(id)) {
            newExpandedRows.delete(id)
        } else {
            newExpandedRows.add(id)
        }
        setExpandedRows(newExpandedRows)
    }

    const filteredTransactions = transactions.filter(
        (transaction) =>
            transaction.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transaction.timeOrdered.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            const formData = new FormData()
            formData.append('_action', 'delete')
            formData.append('id', id)

            submit(formData, { method: 'post' })
            notifications.show({
                title: 'Success',
                message: 'Transaction deleted successfully',
                color: 'green',
            })
        }
    }

    const handleUpdate = (values) => {
        const formData = new FormData()
        formData.append('_action', 'update')
        Object.entries(values).forEach(([key, value]) => {
            formData.append(key, value)
        })

        submit(formData, { method: 'post' })
        close()
        notifications.show({
            title: 'Success',
            message: 'Transaction updated successfully',
            color: 'green',
        })
    }

    const ItemsDetail = ({ items }) => (
        <Stack spacing="xs">
            {items.map((item, index) => (
                <Box key={index}>
                    <Group position="apart">
                        <Text size="sm">
                            {item.item.item}
                        </Text>
                        <Group spacing="xs">
                            <Badge variant="light">
                                Qty: {item.quantity}
                            </Badge>
                            <Badge variant="filled" color="blue">
                                ₱{item.item.price}
                            </Badge>
                            <Badge variant="filled" color="green">
                                Subtotal: ₱{item.quantity * item.item.price}
                            </Badge>
                        </Group>
                    </Group>
                </Box>
            ))}
        </Stack>
    )

    return (
        <Box p="md">
            <Stack spacing="md">
                <Group position="apart">
                    <Text size="xl" weight={700}>
                        Transaction Log
                    </Text>
                    <TextInput
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        w={300}
                    />
                </Group>

                <Paper shadow="sm" p="md" withBorder>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Customer</Table.Th>
                                <Table.Th>Cashier</Table.Th>
                                <Table.Th>Items</Table.Th>
                                <Table.Th>Total Amount</Table.Th>
                                <Table.Th>Payment Method</Table.Th>
                                <Table.Th>Date</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredTransactions.map((transaction) => (
                                <>
                                    <Table.Tr
                                        key={transaction.id}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => toggleRow(transaction.id)}
                                    >
                                        <Table.Td>{transaction.customerName}</Table.Td>
                                        <Table.Td>{transaction.cashier.username}</Table.Td>
                                        <Table.Td>
                                            <Stack spacing={4}>
                                                <Group>
                                                    <Text size="sm">
                                                        {transaction.items.length} items
                                                    </Text>
                                                    <Badge variant="light">
                                                        Click to {expandedRows.has(transaction.id) ? 'hide' : 'show'} details
                                                    </Badge>
                                                </Group>
                                            </Stack>
                                        </Table.Td>
                                        <Table.Td>₱{transaction.totalAmount}</Table.Td>
                                        <Table.Td>{transaction.paymentMethod}</Table.Td>
                                        <Table.Td>{transaction.timeOrdered}</Table.Td>
                                        <Table.Td>
                                            <Group spacing={4}>
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    color="blue"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedTransaction(transaction)
                                                        open()
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    color="red"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDelete(transaction.id)
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                    <Table.Tr>
                                        <Table.Td colSpan={7} p={0}>
                                            <Collapse in={expandedRows.has(transaction.id)}>
                                                <Box p="md" bg="gray.0">
                                                    <ItemsDetail items={transaction.items} />
                                                </Box>
                                            </Collapse>
                                        </Table.Td>
                                    </Table.Tr>
                                </>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Paper>
            </Stack>

            <Modal
                opened={opened}
                onClose={close}
                title="Edit Transaction"
                size="md"
            >
                {selectedTransaction && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            const values = Object.fromEntries(formData.entries())
                            handleUpdate({ ...values, id: selectedTransaction.id })
                        }}
                    >
                        <Stack spacing="md">
                            <TextInput
                                label="Customer Name"
                                name="customerName"
                                defaultValue={selectedTransaction.customerName}
                                required
                            />
                            <Select
                                label="Payment Method"
                                name="paymentMethod"
                                defaultValue={selectedTransaction.paymentMethod}
                                data={['Cash', 'Card', 'GCash']}
                                required
                            />
                            <Group position="right">
                                <Button variant="light" onClick={close}>
                                    Cancel
                                </Button>
                                <Button type="submit" color="blue">
                                    Save Changes
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                )}
            </Modal>
        </Box>
    )
}
