# Job Portal UI 💼

A job portal single-page app with three roles. Job seekers browse and apply for jobs, employers post listings and review applicants, and admins manage companies, employers and contact messages.

There is no backend. Services in `src/services/` simulate async API calls over mock data (1,000 jobs across 30 companies), and everything you do is saved to your browser's localStorage.

## Screenshots

**Home**: hero with job search by keyword and location

![Job Portal home page](screenshots/home.png)

**Find Jobs**: search and filter 1,000 jobs by category, experience, work type, salary and remote

![Jobs list with filters and job cards](screenshots/jobs.png)

| Job detail | Companies |
| --- | --- |
| ![Brand Designer job at Intel, with salary and apply buttons](screenshots/job-detail.png) | ![Top Companies page with company cards](screenshots/companies.png) |

| Login with demo accounts | Dark mode |
| --- | --- |
| ![Login page showing demo credentials](screenshots/login.png) | ![Home page in dark mode](screenshots/home-dark.png) |

**Job seeker**

| Profile | Applied jobs |
| --- | --- |
| ![Job seeker profile with completeness bar](screenshots/profile.png) | ![My Applied Jobs page](screenshots/applied-jobs.png) |

**Employer**

| Post a job | My posted jobs |
| --- | --- |
| ![Post a New Job form](screenshots/post-job.png) | ![My Posted Jobs dashboard](screenshots/employer-jobs.png) |

**Admin**

![Admin dashboard with company, employer and contact message management](screenshots/admin-dashboard.png)

**Mobile**

| Home | Jobs |
| --- | --- |
| <img src="screenshots/mobile-home.png" alt="Home page on a phone" width="300"> | <img src="screenshots/mobile-jobs.png" alt="Jobs page on a phone" width="300"> |

## Features

- **Job search** with keyword, location, category, experience level, work type, minimum salary and remote-only filters, plus sorting and pagination.
- **Job and company detail pages** with salary, job overview and open positions.
- **Job seekers** can build a profile, apply for jobs, save jobs and track their applications.
- **Employers** can post, edit and manage jobs and review the applicants for each one.
- **Admins** can manage companies, assign employers to companies and read contact form messages.
- **Role-based routes.** Pages for each role are protected and redirect to login.
- **Dark mode** toggle, remembered between visits.
- **Responsive** layout with a mobile menu.

## Running it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Job seeker | jobseeker@email.com | jobseeker123 |
| Employer | employer@company.com | employer123 |
| Admin | admin@portal.com | admin123 |

The login page also has a **Show Demo Credentials** button that fills these in.

## Tech stack

React 19, Vite 7, Tailwind CSS 4, React Router 7, Font Awesome, Lucide React and react-toastify.

## Project structure

```
src/
  components/   Navbar, Footer, Hero, ProtectedRoute and other shared UI
  context/      AuthContext, JobContext, ThemeContext
  contexts/     JobsDataContext (cached job list), CompaniesContext
  data/         mockData.js
  pages/        Home, Jobs, JobDetail, Companies, Profile, PostJob, ...
  pages/admin/  Dashboard, CompanyManagement, EmployerManagement, ContactMessages
  services/     Simulated async API calls
```
