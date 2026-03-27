import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface AccessRequestAdminProps {
  requesterName: string
  requesterEmail: string
  roleRequested: string
  teamName: string
  message?: string
  appUrl: string
}

export function AccessRequestAdmin({
  requesterName,
  requesterEmail,
  roleRequested,
  teamName,
  message,
  appUrl,
}: AccessRequestAdminProps) {
  const approvalsUrl = `${appUrl}/dashboard/admin/approvals`

  return (
    <Html>
      <Head />
      <Preview>New access request from {requesterName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New Access Request</Heading>
          <Text style={text}>A new user has verified their email and is requesting access.</Text>
          <Section style={detailSection}>
            <Text style={detailRow}><strong>Name:</strong> {requesterName}</Text>
            <Text style={detailRow}><strong>Email:</strong> {requesterEmail}</Text>
            <Text style={detailRow}><strong>Requested Role:</strong> {roleRequested}</Text>
            <Text style={detailRow}><strong>Team:</strong> {teamName}</Text>
            {message && <Text style={detailRow}><strong>Message:</strong> {message}</Text>}
          </Section>
          <Section style={buttonSection}>
            <Button href={approvalsUrl} style={button}>Review in Admin Panel</Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Kairos · Admin Notification</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AccessRequestAdmin

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '40px auto', padding: '40px', maxWidth: '480px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const heading = { fontSize: '20px', fontWeight: '700', color: '#004ac6', marginBottom: '16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '8px 0' }
const detailSection = { backgroundColor: '#f9fafb', borderRadius: '6px', padding: '16px', margin: '16px 0' }
const detailRow = { fontSize: '14px', color: '#374151', margin: '4px 0' }
const buttonSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#004ac6', color: '#ffffff', fontSize: '14px', fontWeight: '600', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af' }
