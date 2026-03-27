import {
  Body,
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

interface LoginOtpProps {
  name: string
  otp: string
}

export function LoginOtp({ name, otp }: LoginOtpProps) {
  return (
    <Html>
      <Head />
      <Preview>Your login code: {otp}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Kairos</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>Use the code below to sign in to your account.</Text>
          <Section style={otpSection}>
            <Text style={otpCode}>{otp}</Text>
          </Section>
          <Text style={smallText}>This code expires in <strong>10 minutes</strong>.</Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you did not request this login code, please ignore this email — your account is safe.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default LoginOtp

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '40px auto', padding: '40px', maxWidth: '480px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const heading = { fontSize: '20px', fontWeight: '700', color: '#004ac6', marginBottom: '24px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '8px 0' }
const otpSection = { textAlign: 'center' as const, margin: '32px 0' }
const otpCode = { fontSize: '48px', fontWeight: '700', letterSpacing: '12px', color: '#004ac6', margin: '0' }
const smallText = { fontSize: '13px', color: '#6b7280', margin: '8px 0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }
