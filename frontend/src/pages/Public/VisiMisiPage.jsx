import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PillNav from '../PillNav';
import Footer from '../../components/Footer';

const VisiMisiPage = () => {
  const logoDataURL = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjEuOCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIvPjxlbGxpcHNlIGN4PSIxMiIgY3k9IjEyIiByeD0iMTAiIHJ5PSI0LjUiIHRyYW5zZm9ybT0icm90YXRlKDYwIDEyIDEyKSIvPjxlbGxpcHNlIGN4PSIxMiIgY3k9IjEyIiByeD0iMTAiIHJ5PSI0LjUiIHRyYW5zZm9ybT0icm90YXRlKDEyMCAxMiAxMikiLz48ZWxsaXBzZSBjeD0iMTIiIGN5PSIxMiIgcng9IjEwIiByeT0iNC41Ii8+PC9zdmc+";
  const [activeTab, setActiveTab] = useState('stt-nf');

  const institutions = {
    'stt-nf': {
      name: 'Sekolah Tinggi Teknologi Terpadu Nurul Fikri',
      color: 'from-pink-500 to-rose-500',
      textColor: 'text-pink-300',
      borderColor: 'border-pink-500/30',
      visi: 'Pada tahun 2045 menjadi sekolah tinggi yang unggul di Indonesia, berbudaya inovasi, berjiwa teknopreneur, dan berkarakter religius.',
      misi: [
        'Menyelenggarakan pendidikan tinggi berkualitas berlandaskan iman dan takwa.',
        'Melaksanakan penelitian inovatif berorientasi teknologi masa depan.',
        'Pengabdian masyarakat dengan teknologi tepat guna.',
        'Membangun lingkungan akademik kondusif dan inovatif.'
      ],
      tujuan: [
        'Menghasilkan sarjana kompeten, profesional, dan berakhlak mulia.',
        'Menghasilkan karya ilmiah inovatif dan terbuka (open source & open access).',
        'Menerapkan IPTEK tepat guna bagi masyarakat.',
        'Membangun kultur akademik inovatif dan kompetitif.'
      ]
    },
    'ti': {
      name: 'Program Studi Teknik Informatika',
      color: 'from-blue-500 to-cyan-500',
      textColor: 'text-blue-300',
      borderColor: 'border-blue-500/30',
      visi: 'Pada tahun 2045 menjadi program studi teknik informatika yang unggul, berbudaya inovasi, dan berkarakter religius.',
      misi: [
        'Menyelenggarakan pendidikan teknik informatika berkualitas.',
        'Melaksanakan penelitian berorientasi teknologi masa depan.',
        'Pengabdian masyarakat berbasis teknologi tepat guna.',
        'Membangun budaya akademik inovatif dan mandiri.'
      ],
      tujuan: [
        'Menghasilkan sarjana TI profesional dan berakhlak mulia.',
        'Melahirkan karya ilmiah terbuka & inovatif di bidang TI.',
        'Menerapkan teknologi tepat guna bagi masyarakat.'
      ]
    },
    'si': {
      name: 'Program Studi Sistem Informasi',
      color: 'from-green-500 to-emerald-500',
      textColor: 'text-green-300',
      borderColor: 'border-green-500/30',
      visi: 'Pada tahun 2045 menjadi program studi sistem informasi yang unggul, inovatif, dan religius.',
      misi: [
        'Pendidikan berkualitas bidang Sistem Informasi.',
        'Penelitian inovatif dan masa depan.',
        'Pengabdian masyarakat berbasis teknologi tepat guna.',
        'Membangun budaya akademik inovatif dan mandiri.'
      ],
      tujuan: [
        'Lulusan kompeten & profesional.',
        'Karya ilmiah terbuka dan inovatif.',
        'Implementasi teknologi bagi masyarakat.'
      ]
    },
    'bd': {
      name: 'Program Studi Bisnis Digital',
      color: 'from-yellow-500 to-orange-500',
      textColor: 'text-yellow-300',
      borderColor: 'border-yellow-500/30',
      visi: 'Pada tahun 2045 menjadi program studi bisnis digital yang unggul, inovatif, dan berkarakter religius.',
      misi: [
        'Pendidikan berkualitas bidang bisnis digital.',
        'Penelitian inovatif masa depan.',
        'Pengabdian masyarakat berbasis teknologi bisnis.',
        'Membangun budaya akademik inovatif.'
      ],
      tujuan: [
        'Lulusan profesional & berakhlak mulia.',
        'Karya ilmiah bidang bisnis digital.',
        'Penerapan teknologi tepat guna untuk masyarakat.'
      ]
    }
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

  const currentInstitution = institutions[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white font-sans">
      {/* Navigation */}
      <PillNav
        logo={logoDataURL}
        logoAlt="Student Hub Logo"
        items={[
          { label: 'Home', href: '/' },
          { label: 'Kurikulum', href: '/kurikulum' },
          { label: 'Kalender', href: '/kalender-akademik' },
          { label: 'Login', href: '/' }
        ]}
        activeHref="/visi-misi"
        className="custom-nav"
        ease="power6.easeOut"
        baseColor="#fff"
        pillColor="#060010"
        hoveredPillTextColor="#060010"
        pillTextColor="#ffffff"
      />

      {/* Header */}
      <header className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-purple-300 hover:text-white transition-colors duration-300 mb-8 group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Kembali ke Beranda
          </Link>

          <h1 className="font-bold text-5xl md:text-6xl text-transparent bg-clip-text bg-lp-bg mb-6">
            Visi & Misi
          </h1>
          <p className="text-xl text-purple-200 max-w-3xl mx-auto">
            Integritas, inovasi, teknopreneurship, dan karakter religius untuk membangun generasi unggul Indonesia 2045.
          </p>
        </div>
      </header>

      {/* Content */}
      <section className="py-10 px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {Object.entries(institutions).map(([key, institution]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                  activeTab === key
                    ? `bg-gradient-to-r ${institution.color} text-white shadow-2xl`
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-600/50'
                }`}
              >
                {institution.name.split(' ')[0]} {institution.name.split(' ')[1]}
              </button>
            ))}
          </div>

          {/* Content Card */}
          <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <div className={`h-2 bg-gradient-to-r ${currentInstitution.color}`}></div>
            
            <div className="p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className={`text-3xl font-bold ${currentInstitution.textColor} mb-4`}>
                  {currentInstitution.name}
                </h2>
                <div className="w-24 h-1 bg-lp-bg mx-auto rounded-full"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visi */}
                <div className="lg:col-span-3">
                  <div className={`p-6 rounded-2xl bg-gradient-to-br from-gray-900/60 to-gray-800/40 border ${currentInstitution.borderColor} backdrop-blur-md`}>
                    <h3 className={`text-xl font-bold ${currentInstitution.textColor} mb-4 flex items-center gap-3`}>
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${currentInstitution.color}`}></div>
                      Visi
                    </h3>
                    <p className="text-gray-200 text-lg leading-relaxed">
                      {currentInstitution.visi}
                    </p>
                  </div>
                </div>

                {/* Misi */}
                <div className="lg:col-span-2">
                  <div className={`p-6 rounded-2xl bg-gradient-to-br from-gray-900/60 to-gray-800/40 border ${currentInstitution.borderColor} backdrop-blur-md h-full`}>
                    <h3 className={`text-xl font-bold ${currentInstitution.textColor} mb-4 flex items-center gap-3`}>
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${currentInstitution.color}`}></div>
                      Misi
                    </h3>
                    <ul className="space-y-3">
                      {currentInstitution.misi.map((item, index) => (
                        <li key={index} className="flex items-start gap-3 text-gray-200">
                          <div className={`w-2 h-2 rounded-full mt-2 bg-gradient-to-r ${currentInstitution.color}`}></div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tujuan */}
                <div className="lg:col-span-1">
                  <div className={`p-6 rounded-2xl bg-gradient-to-br from-gray-900/60 to-gray-800/40 border ${currentInstitution.borderColor} backdrop-blur-md h-full`}>
                    <h3 className={`text-xl font-bold ${currentInstitution.textColor} mb-4 flex items-center gap-3`}>
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${currentInstitution.color}`}></div>
                      Tujuan
                    </h3>
                    <ul className="space-y-3">
                      {currentInstitution.tujuan.map((item, index) => (
                        <li key={index} className="flex items-start gap-3 text-gray-200">
                          <div className={`w-2 h-2 rounded-full mt-2 bg-gradient-to-r ${currentInstitution.color}`}></div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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

export default VisiMisiPage;