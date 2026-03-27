import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface AccessRejectedProps {
  name: string
  reason?: string
  adminEmail: string
}

export function AccessRejected({ name, reason, adminEmail }: AccessRejectedProps) {
  return (
    <Html>
      <Head />
      <Preview>Update on your Lohono Command Center access request</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Access Request Update</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            After review, your request to access Lohono Command Center was not approved at this time.
          </Text>
          {reason && (
            <Text style={reasonText}>
              <strong>Reason:</strong> {reason}
            </Text>
          )}
          <Text style={text}>
            If you believe this is a mistake or have questions, please reach out to{' '}
            <a href={`mailto:${adminEmail}`} style={link}>{adminEmail}</a>.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>Lohono Command Center</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AccessRejected

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '40px auto', padding: '40px', maxWidth: '480px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const heading = { fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '8px 0' }
const reasonText = { fontSize: '14px', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '6px', padding: '12px 16px', margin: '16px 0' }
const link = { color: '#004ac6', textDecoration: 'underline' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af' }
