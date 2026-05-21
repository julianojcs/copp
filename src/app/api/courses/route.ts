import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Course } from '@/models/course'

export async function GET() {
  await connectDB()
  const items = await Course.find({ isActive: true }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({
    items: items.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      code: c.code,
      location: c.location,
    })),
  })
}
