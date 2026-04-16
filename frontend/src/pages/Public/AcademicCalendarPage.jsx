import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PillNav from '../PillNav';
import Footer from '../../components/Footer';

const AcademicCalendarPage = () => {
  const logoDataURL = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjEuOCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjxlbGxpcHNlIGN4PSIxMiIgY3k9IjEyIiByeD0iMTAiIHJ5PSI0LjUiIHRyYW5zZm9ybT0icm90YXRlKDYwIDEyIDEyKSIvPjxlbGxpcHNlIGN4PSIxMiIgY3k9IjEyIiByeD0iMTAiIHJ5PSI0LjUiIHRyYW5zZm9ybT0icm90YXRlKDEyMCAxMiAxMikiLz48ZWxsaXBzZSBjeD0iMTIiIGN5PSIxMiIgcng9IjEwIiByeT0iNC41Ii8+PC9zdmc+";
  const [selectedDate, setSelectedDate] = useState(null);

  const academicCalendar = [
    { date: "2025-08-13", event: "Dies Natalis STT NF", type: "event" },
    { date: "2025-09-15", endDate: "2025-09-20", event: "Orientasi Akademik Mahasiswa Baru 2025", type: "important" },
    { date: "2025-09-08", endDate: "2025-09-13", event: "Bimbingan Akademik (PA) 1", type: "academic" },
    { date: "2025-09-15", endDate: "2025-09-20", event: "Isi KRS Mahasiswa Semester Ganjil", type: "academic" },
    { date: "2025-09-15", endDate: "2025-09-30", event: "Pengajuan Cuti Kuliah", type: "academic" },
    { date: "2025-09-22", event: "Kuliah Perdana Semester Ganjil", type: "important" },
    { date: "2025-09-22", endDate: "2025-11-08", event: "Perkuliahan Pekan Ke-1 s.d Ke-7", type: "academic" },
    { date: "2025-10-07", event: "Kuliah Umum", type: "event" },
    { date: "2025-10-15", event: "Pengumuman Dosen Pembimbing Tugas Akhir", type: "academic" },
    { date: "2025-11-10", endDate: "2025-11-15", event: "Pelaksanaan UTS dan Ujian Tugas Akhir", type: "exam" },
    { date: "2026-01-12", endDate: "2026-01-17", event: "Pelaksanaan UAS", type: "exam" },
    { date: "2026-01-19", endDate: "2026-01-24", event: "Pelaksanaan Sidang TA Ganjil", type: "exam" },
    { date: "2026-02-06", event: "Pengumuman Yudisium", type: "important" }
  ];

  const months = [
    { name: "Agustus 2025", year: 2025, month: 7 },
    { name: "September 2025", year: 2025, month: 8 },
    { name: "Oktober 2025", year: 2025, month: 9 },
    { name: "November 2025", year: 2025, month: 10 },
    { name: "Desember 2025", year: 2025, month: 11 },
    { name: "Januari 2026", year: 2026, month: 0 },
    { name: "Februari 2026", year: 2026, month: 1 }
  ];

  const getEventsForDate = (date) => {
    return academicCalendar.filter(event => {
      const eventDate = new Date(event.date);
      if (event.endDate) {
        const endDate = new Date(event.endDate);
        return date >= eventDate && date <= endDate;
      }
      return date.toDateString() === eventDate.toDateString();
    });
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'important': return 'bg-red-500';
      case 'exam': return 'bg-orange-500';
      case 'event': return 'bg-purple-500';
      case 'academic': return 'bg-lp-accent';
      default: return 'bg-lp-bg0';
    }
  };

  const CalendarMonth = ({ year, month, monthName }) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Add empty days for the first week
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4 text-center">{monthName}</h3>
        <div className="grid grid-cols-7 gap-1">
          {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map(day => (
            <div key={day} className="text-center text-sm text-gray-400 font-semibold py-2">
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            if (day === null) {
              return <div key={index} className="h-10"></div>;
            }

            const currentDate = new Date(year, month, day);
            const events = getEventsForDate(currentDate);
            const hasEvents = events.length > 0;

            return (
              <div
                key={index}
                className={`h-10 flex items-center justify-center relative cursor-pointer transition-all duration-200 ${
                  hasEvents 
                    ? 'bg-purple-500/20 border border-purple-400/30 rounded-lg hover:bg-purple-500/30' 
                    : 'hover:bg-gray-700/50 rounded-lg'
                }`}
                onClick={() => setSelectedDate({ date: currentDate, events })}
              >
                <span className={`text-sm ${hasEvents ? 'text-white font-bold' : 'text-gray-300'}`}>
                  {day}
                </span>
                {hasEvents && (
                  <div className="absolute -top-1 -right-1 flex gap-1">
                    {events.slice(0, 2).map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className={`w-2 h-2 rounded-full ${getEventColor(event.type)}`}
                        title={event.event}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const Footer = () => (
    <footer className="bg-gray-900/80 backdrop-blur-md text-gray-400 py-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <h3 className="text-white text-2xl font-bold mb-4">Student Hub</h3>
          <p className="mb-4 max-w-md">
            Platform akademik modern yang mengintegrasikan pembelajaran dengan pengalaman sosial media untuk mahasiswa, dosen, dan orang tua.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-gray-400 hover:text-white transition">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Platform</h4>
          <ul className="space-y-2">
            <li><a href="#features" className="hover:text-white transition">Fitur</a></li>
            <li><a href="/kurikulum" className="hover:text-white transition">Kurikulum</a></li>
            <li><a href="/visi-misi" className="hover:text-white transition">Visi Misi</a></li>
            <li><a href="/kalender-akademik" className="hover:text-white transition">Kalender</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Perusahaan</h4>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-white transition">Tentang Kami</a></li>
            <li><a href="#" className="hover:text-white transition">Karir</a></li>
            <li><a href="#" className="hover:text-white transition">Blog</a></li>
            <li><a href="#" className="hover:text-white transition">Kontak</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-8 pt-8 border-t border-gray-800 text-center">
        <p>&copy; {new Date().getFullYear()} Student Hub. All rights reserved.</p>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white font-sans">
      {/* Navigation */}
      <PillNav
        logo={logoDataURL}
        logoAlt="Student Hub Logo"
        items={[
          { label: 'Home', href: '/' },
          { label: 'Visi Misi', href: '/visi-misi' },
          { label: 'Kurikulum', href: '/kurikulum' },
          { label: 'Login', href: '/' }
        ]}
        activeHref="/kalender-akademik"
        className="custom-nav"
        ease="power6.easeOut"
        baseColor="#fff"
        pillColor="#060010"
        hoveredPillTextColor="#060010"
        pillTextColor="#ffffff"
      />

      {/* Header */}
      <header className="pt-32 pb-10 px-6">
        <div className="max-w-7xl mx-auto">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-purple-300 hover:text-white transition-colors duration-300 mb-6 group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Kembali ke Beranda
          </Link>
          
          <div className="text-center">
            <h1 className="font-bold text-5xl md:text-6xl text-transparent bg-clip-text bg-lp-bg mb-6">
              Kalender Akademik 2025-1
            </h1>
            <p className="text-xl text-purple-200 max-w-3xl mx-auto">
              Jadwal lengkap kegiatan akademik untuk semester ganjil tahun ajaran 2025/2026
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="py-10 px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Calendar Grid */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {months.map(month => (
                  <CalendarMonth
                    key={month.name}
                    year={month.year}
                    month={month.month}
                    monthName={month.name}
                  />
                ))}
              </div>
            </div>

            {/* Sidebar - Event Details & Legend */}
            <div className="lg:col-span-1 space-y-6">
              {/* Legend */}
              <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Keterangan</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-200 text-sm">Penting</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-gray-200 text-sm">Ujian</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-gray-200 text-sm">Acara</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-lp-accent"></div>
                    <span className="text-gray-200 text-sm">Akademik</span>
                  </div>
                </div>
              </div>

              {/* Selected Date Events */}
              {selectedDate && (
                <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {selectedDate.date.toLocaleDateString('id-ID', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                  <div className="space-y-3">
                    {selectedDate.events.map((event, index) => (
                      <div key={index} className="p-3 bg-gray-700/30 rounded-lg border-l-4 border-purple-500">
                        <p className="text-white text-sm font-medium">{event.event}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {event.endDate 
                            ? `${new Date(event.date).toLocaleDateString('id-ID')} - ${new Date(event.endDate).toLocaleDateString('id-ID')}`
                            : new Date(event.date).toLocaleDateString('id-ID')
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Events List */}
              <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Event Mendatang</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {academicCalendar.slice(0, 5).map((event, index) => (
                    <div key={index} className="p-3 bg-gray-700/30 rounded-lg">
                      <p className="text-white text-sm font-medium">{event.event}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(event.date).toLocaleDateString('id-ID')}
                        {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('id-ID')}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AcademicCalendarPage;