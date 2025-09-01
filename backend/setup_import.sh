#!/bin/bash

echo "🚀 Setting up Claimants and Claims Import"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating template..."
    cat > .env << EOF
DB_USER=postgres
DB_HOST=localhost
DB_NAME=interpreter_platform
DB_PASSWORD=your_password_here
DB_PORT=5432
EOF
    echo "✅ Created .env template. Please update with your actual database credentials."
    echo "   Then run this script again."
    exit 1
fi

echo "✅ .env file found"

# Check if CSV file exists
if [ ! -f claimants_import.csv ]; then
    echo "⚠️  claimants_import.csv not found. Using sample file..."
    if [ -f claimants_import_sample.csv ]; then
        cp claimants_import_sample.csv claimants_import.csv
        echo "✅ Copied sample CSV file"
    else
        echo "❌ Sample CSV file not found. Please create claimants_import.csv with your data."
        exit 1
    fi
fi

echo "✅ CSV file ready"

# Test database connection
echo "🔌 Testing database connection..."
node scripts/test_db_connection.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎯 Ready to import! Run the following command:"
    echo "   node scripts/import_claimants_with_claims.js"
    echo ""
    echo "📋 Or run the full import now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🚀 Starting import..."
        node scripts/import_claimants_with_claims.js
    else
        echo "✅ Setup complete. Run the import when ready."
    fi
else
    echo "❌ Database connection failed. Please check your .env file and database status."
    exit 1
fi
