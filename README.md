# Restaurant Management System

A comprehensive Next.js-based restaurant management system with role-based access control, order management, kitchen operations, and real-time data synchronization.

## Features

- **Role-Based Access Control**: Support for Super Admin, Branch Admin, Order Taker, Accountant, and Kitchen roles
- **Order Management**: Complete order lifecycle from creation to bill generation
- **Kitchen Operations**: Real-time kitchen order tracking and status updates
- **Menu & Category Management**: Full CRUD operations for menu items and categories
- **Multi-Branch Support**: Super Admin can manage multiple branches
- **Bill Generation**: Automatic bill generation with discounts and service charges
- **Sales Reports**: Comprehensive sales and menu sales reporting
- **Table & Hall Management**: Organize dining spaces efficiently

## Tech Stack

- **Framework**: Next.js 16.0.3
- **Language**: JavaScript/React
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-url.com/restuarent/api
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
chai/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   │   ├── super-admin/   # Super Admin pages
│   │   ├── branch-admin/  # Branch Admin pages
│   │   ├── order-taker/   # Order Taker pages
│   │   └── accountant/    # Accountant pages
│   ├── login/             # Login page
│   └── page.jsx           # Home page
├── components/            # Reusable components
│   ├── admin/            # Admin layout components
│   ├── super-admin/      # Super Admin layout components
│   └── ui/               # UI components (Button, Input, Modal, etc.)
├── utils/                # Utility functions
│   ├── api.js            # API helper functions
│   └── format.js         # Formatting utilities
└── public/               # Static assets
```

## API Documentation

See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for complete API endpoint documentation.

See [API_STANDARDIZATION_SUMMARY.md](./API_STANDARDIZATION_SUMMARY.md) for API standardization details.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `.next` directory.

## Deployment

The application can be deployed to any platform that supports Next.js:

- **Vercel** (Recommended)
- **Netlify**
- **AWS Amplify**
- **Self-hosted** with Node.js

## Key Features

### Super Admin Dashboard
- Manage multiple branches
- View all branches' data
- User and account management
- Full system access

### Branch Admin Dashboard
- Manage branch-specific operations
- Kitchen management
- Order management
- Menu and category management
- Sales reports

### Order Taker
- Create new orders
- Select tables and halls
- Add items to cart
- Generate order receipts

### Kitchen Staff
- View assigned kitchen orders
- Update order item status
- Print kitchen receipts
- Monitor order progress

### Accountant
- View all orders
- Generate bills
- Payment processing
- Financial reports

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL` - Base URL for the backend API

## License

Private project - All rights reserved

## Support

For issues or questions, please check the API documentation or contact the development team.
