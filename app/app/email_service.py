"""
email_service.py
----------------
Sends email notifications via SendGrid.
"""
import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "alerts@mizan-halal.com")

def send_price_alert_email(
    to_email: str,
    user_name: str,
    ticker: str,
    stock_name: str,
    current_price: float,
    target_price: float,
    condition: str,
) -> bool:
    """Sends a price alert email. Returns True if sent successfully."""
    if not SENDGRID_API_KEY:
        logging.warning("SENDGRID_API_KEY not set — skipping email")
        return False

    direction = "dropped to" if condition == "below" else "risen to"
    subject = f"🔔 Mizan Alert: {ticker} has {direction} your target!"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; 
                background: #0f172a; color: #f1f5f9; border-radius: 12px; 
                padding: 32px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px;">🕌</span>
            <h1 style="color: #22c55e; margin: 8px 0 4px;">Mizan</h1>
            <p style="color: #64748b; margin: 0; font-size: 13px;">Halal Stock Screener</p>
        </div>

        <h2 style="color: #f1f5f9; margin-bottom: 8px;">Price Alert Triggered! 🔔</h2>
        <p style="color: #94a3b8;">Hi {user_name}, your target price for <strong style="color:#22c55e">{ticker}</strong> has been reached.</p>

        <div style="background: #1e293b; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Stock</td>
                    <td style="color: #f1f5f9; font-weight: bold; text-align: right;">{stock_name} ({ticker})</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Current Price</td>
                    <td style="color: #22c55e; font-weight: bold; font-size: 18px; text-align: right;">${current_price:.2f}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Your Target</td>
                    <td style="color: #f1f5f9; text-align: right;">${target_price:.2f}</td>
                </tr>
            </table>
        </div>

        <a href="https://mizan-web-omega.vercel.app" 
           style="display: block; text-align: center; background: #22c55e; 
                  color: #fff; padding: 14px; border-radius: 8px; 
                  text-decoration: none; font-weight: bold; margin-top: 16px;">
            View on Mizan →
        </a>

        <p style="color: #475569; font-size: 11px; text-align: center; margin-top: 24px;">
            You received this because you set a price alert on Mizan Halal Screener.
        </p>
    </div>
    """

    try:
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
        return True
    except Exception as e:
        logging.error(f"Email send failed: {e}")
        return False