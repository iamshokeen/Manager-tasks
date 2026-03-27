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

interface AccessApprovedProps {
  name: string
  appUrl: string
}

export function AccessApproved({ name, appUrl }: AccessApprovedProps) {
  const loginUrl = `${appUrl}/auth/login`

  return (
    <Html>
      <Head />
      <Preview>Your Lohono Command Center access has been approved</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You're in.</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Your access to Lohono Command Center has been approved. You can now sign in and get started.
          </Text>
          <Section style={buttonSection}>
            <Button href={loginUrl} style={button}>Sign In</Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Lohono Command Center · {appUrl}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AccessApproved

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '40px auto', padding: '40px', maxWidth: '480px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const heading = { fontSize: '24px', fontWeight: '700', color: '#004ac6', marginBottom: '16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '8px 0' }
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const button = { backgroundColor: '#004ac6', color: '#ffffff', fontSize: '15px', fontWeight: '600', padding: '14px 28px', borderRadius: '6px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af' }
