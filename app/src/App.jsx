import { useState } from 'react'
import Footer from '@/com/Footer'
import QuoteList from '@/com/QuoteList'

import '@/App.css'


function App() {
  const [count, setCount] = useState(0)

  return <>
    <header>manthra</header>

    <QuoteList />

    <Footer />
  </>
}

export default App
