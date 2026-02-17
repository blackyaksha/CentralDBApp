import { useNavigate } from 'react-router-dom'
import pdfIcon from '../assets/Icons/pdf.png'
import docxIcon from '../assets/Icons/docs.png'
import xlsxIcon from '../assets/Icons/sheets.png'
import pptxIcon from '../assets/Icons/pptx.png'
import folderIcon from '../assets/Icons/folder.png'
import zipIcon from '../assets/Icons/zip-folder.png'
import movIcon from '../assets/Icons/mov.png'
import mp3Icon from '../assets/Icons/mp3.png'
import mp4Icon from '../assets/Icons/mp4.png'
import m4vIcon from '../assets/Icons/m4v.png'
import tmpIcon from '../assets/Icons/tmp.png'
import rarIcon from '../assets/Icons/rar.png'
import jpgIcon from '../assets/Icons/jpg.png'
import pngIcon from '../assets/Icons/png.png'

export default function Home() {
  const navigate = useNavigate()

  // 🔹 Replace URLs with your actual OneDrive shareable links
  const FILES = [
    {
      title: 'Planning Guidelines Document for PD Team',
      url: 'https://energyregcomm-my.sharepoint.com/:w:/g/personal/ppis_pd_erc_ph/IQBtb1x9no4NS67kd5wvgo-9ATxXBwOvHeN2JaapAwXwA5c',
      icon: docxIcon
    },
    {
      title: 'Project Tracker 2026',
      url: 'https://onedrive.live.com/...replace-with-link...',
      icon: xlsxIcon
    },
    {
      title: 'Presentation Slides Q1',
      url: 'https://onedrive.live.com/...replace-with-link...',
      icon: pptxIcon
    },
    {
      title: 'Policy Document PDF',
      url: 'https://onedrive.live.com/...replace-with-link...',
      icon: pdfIcon
    }
  ]

  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#131212ff' }}>
      <h1>Welcome Planning Division Team!</h1>

      {/* 🔹 File Thumbnails */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 40
        }}
      >
        {FILES.map((f) => (
          <div
            key={f.title}
            onClick={() => window.open(f.url, '_blank')}
            style={{
              width: 180,
              cursor: 'pointer',
              border: '1px solid #131212ff',
              borderRadius: 8,
              padding: 10,
              textAlign: 'center',
              backgroundColor: '#f8f8f8',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
            }}
          >
            <img
              src={f.icon}
              style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 4 }}
              alt={f.title}
            />
            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                fontWeight: 'bold',
                whiteSpace: 'normal',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.2em',
                maxHeight: '2.4em', // allow up to 2 lines
                color: '#131212ff'
              }}
              title={f.title} // show full title on hover
            >
              {f.title}
            </div>
          </div>
        ))}
      </div>

      {/* 🔹 Enter App Button */}
      <button
        onClick={() => navigate('/current')}
        style={{
          marginTop: 50,
          padding: '12px 24px',
          fontSize: 16,
          fontWeight: 'bold',
          borderRadius: 6,
          cursor: 'pointer',
          backgroundColor: '#131212ff',
          color: 'white',
          border: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0f0d0d')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#131212ff')
        }
      >
        Enter App
      </button>
    </div>
  )
}
