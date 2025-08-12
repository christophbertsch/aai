

#!/bin/bash

# Test script to verify the application is working
echo "Testing the React application..."

# Check if the server is running
if curl -s http://localhost:57764 > /dev/null; then
  echo "✓ Server is running"
else
  echo "✗ Server is not running"
  exit 1
fi

# Check if we can access the login page
if curl -s http://localhost:57764/login | grep -q "Login"; then
  echo "✓ Login page is accessible"
else
  echo "✗ Login page is not accessible"
  exit 1
fi

echo "All tests passed!"
echo "You can now open http://localhost:57764/login in your browser"
echo "Use username: test, password: password to login"

