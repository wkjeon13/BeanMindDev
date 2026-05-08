import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { sendClubApplicationNotification, sendClubApprovalNotification } from '../utils/mailer.js';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET as string;

const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

const optionalAuthenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

const router = express.Router();
import prisma from '../utils/prisma.js';

// Create new club
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { name, description, locationName, lat, lng, isPrivate, maxMembers } = req.body;
    let { coverImageUrl } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // --- BASE64 DECODING FOR CLUB COVER IMAGES (ARRAY SUPPORT) ---
    if (coverImageUrl) {
      let imagesToProcess: string[] = [];
      let isJsonArray = false;
      
      if (coverImageUrl.startsWith('[')) {
          try {
              imagesToProcess = JSON.parse(coverImageUrl);
              isJsonArray = true;
          } catch (e) {
              console.log('Failed to parse coverImageUrl JSON array');
          }
      } else if (coverImageUrl.startsWith('data:image')) {
          imagesToProcess = [coverImageUrl];
      }

      if (imagesToProcess.length > 0) {
          const newPaths: string[] = [];
          for (let i = 0; i < imagesToProcess.length; i++) {
              const imgData = imagesToProcess[i];
              if (imgData.startsWith('data:image')) {
                  const base64MimeType = imgData.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
                  const extension = base64MimeType.split('/')[1] || 'jpg';
                  const base64Data = imgData.split(';base64,').pop();

                  if (base64Data) {
                      const fileName = `club_${Date.now()}_${Math.floor(Math.random() * 1000)}_${i}.${extension}`;
                      const relativeDir = path.join('clubs', userId);
                      const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
                      
                      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

                      fs.writeFileSync(path.join(uploadPath, fileName), base64Data, { encoding: 'base64' });
                      newPaths.push(`/uploads/${relativeDir.split(path.sep).join('/')}/${fileName}`);
                  }
              } else {
                  newPaths.push(imgData); // Keep existing URLs if any
              }
          }
          coverImageUrl = isJsonArray || newPaths.length > 1 ? JSON.stringify(newPaths) : newPaths[0];
      }
    }

    const dbUser = await (prisma as any).user.findUnique({ where: { id: userId }, select: { countryCode: true } });
    const userCountry = (dbUser && dbUser.countryCode && dbUser.countryCode !== 'GLOBAL') ? dbUser.countryCode : 'KR';

    const newClub = await (prisma as any).club.create({
      data: {
        name,
        description: description || '',
        coverImageUrl,
        locationName,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        isPrivate: !!isPrivate,
        maxMembers: maxMembers || 100,
        ownerId: userId,
        countryCode: req.body.countryCode || userCountry,
        members: {
          create: {
            userId,
            role: 'OWNER',
          }
        }
      },
      include: {
        _count: { select: { members: true } }
      }
    });

    res.status(201).json(newClub);
  } catch (error: any) {
    console.error('Error creating club:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Club name already exists' });
    }
    res.status(500).json({ error: 'Failed to create club' });
  }
});

// Cache for mass standard feed
let cachedAllClubs: Record<string, any> = {};
let allClubsCacheTime: Record<string, number> = {};
const CACHE_TTL = 10 * 1000; // 10 seconds

// List clubs
router.get('/', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit || '20');
    const skip = parseInt(req.query.skip || '0');
    const { q, recruitingOnly, countryCode } = req.query;
    // OPTIMIZATION: Isolate and parallelize user-specific 'myClubs' logic
    const fetchMyClubsPromise = async () => {
        if (!userId) return [];
        const [myMemberships, myBookmarks] = await Promise.all([
            prisma.clubMember.findMany({ where: { userId, role: { in: ['OWNER', 'ADMIN', 'MEMBER'] } }, select: { clubId: true } }),
            prisma.clubBookmark.findMany({ where: { userId }, select: { clubId: true } })
        ]);
        
        const uniqueMyClubIds = Array.from(new Set([
            ...myMemberships.map(m => m.clubId),
            ...myBookmarks.map(b => b.clubId)
        ]));

        if (uniqueMyClubIds.length === 0) return [];

        const myClubsData = await (prisma as any).club.findMany({
            where: { 
                id: { in: uniqueMyClubIds }, 
                OR: [
                    { isDeleted: false },
                    { isDeleted: true, ownerId: userId }
                ] 
            },
            select: {
              id: true,
              isDeleted: true,
              ownerId: true,
              name: true,
              coverImageUrl: true,
              locationName: true,
              isPrivate: true,
              isRecruiting: true,
              memberCount: true,
              createdAt: true,
              lat: true,
              lng: true,
              owner: { select: { nickname: true } },
              members: { where: { userId } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const myOwnedClubIds = myClubsData.filter((c: any) => c.members[0] && (c.members[0].role === 'OWNER' || c.members[0].role === 'ADMIN')).map((c: any) => c.id);
        
        let pendingMap: any = {};
        if (myOwnedClubIds.length > 0) {
            const pendingCounts = await prisma.clubMember.groupBy({
                by: ['clubId'],
                where: { clubId: { in: myOwnedClubIds }, role: 'PENDING' },
                _count: { _all: true }
            });
            pendingMap = pendingCounts.reduce((acc: any, curr: any) => {
                acc[curr.clubId] = curr._count._all;
                return acc;
            }, {});
        }

        return myClubsData.map(c => {
            const pendingApplicantsCount = pendingMap[c.id] || 0;
            // Payload Diet: Strip bloated base64 legacy data to prevent frontend thread blocking
            const isBloated = c.coverImageUrl && c.coverImageUrl.length > 1000;
            return {
                ...c,
                coverImageUrl: isBloated ? null : c.coverImageUrl,
                pendingApplicantsCount
            };
        });
    };

    const dbUser = userId ? await (prisma as any).user.findUnique({ where: { id: userId }, select: { countryCode: true } }) : null;
    const effectiveCountryCode = (dbUser && dbUser.countryCode && dbUser.countryCode !== 'GLOBAL') ? dbUser.countryCode : countryCode;
    const whereClause: any = { isDeleted: false };
    if (effectiveCountryCode && effectiveCountryCode !== 'GLOBAL') {
        whereClause.countryCode = String(effectiveCountryCode);
    }
    if (recruitingOnly === 'true') {
        whereClause.isRecruiting = true;
    }
    if (q) {
        const queryStr = String(q);
        whereClause.OR = [
            { name: { contains: queryStr } },
            { locationName: { contains: queryStr } },
            { owner: { nickname: { contains: queryStr } } }
        ];
    }

    const isStandardQuery = !q && !recruitingOnly && skip === 0 && !req.query.lastId && limit <= 20;

    let allClubsPromise;
    const ccKey = String(effectiveCountryCode || 'GLOBAL');
    if (isStandardQuery && Date.now() - (allClubsCacheTime[ccKey] || 0) < CACHE_TTL && cachedAllClubs[ccKey]) {
        allClubsPromise = Promise.resolve(cachedAllClubs[ccKey]);
    } else {
        allClubsPromise = (prisma as any).club.findMany({
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
            select: {
              id: true,
              name: true,
              coverImageUrl: true,
              locationName: true,
              isPrivate: true,
              isRecruiting: true,
              maxMembers: true,
              memberCount: true,
              createdAt: true,
              lat: true,
              lng: true,
              owner: { select: { nickname: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            ...(req.query.lastId ? { cursor: { id: req.query.lastId }, skip: 1 } : { skip: skip })
        }).then(res => {
            const sanitizedRes = res.map(c => {
                // Payload Diet: Strip bloated base64 legacy data to prevent frontend thread blocking
                const isBloated = c.coverImageUrl && c.coverImageUrl.length > 1000;
                if (isBloated) {
                    return { ...c, coverImageUrl: null };
                }
                return c;
            });
            if (isStandardQuery) {
                cachedAllClubs[ccKey] = sanitizedRes;
                allClubsCacheTime[ccKey] = Date.now();
            }
            return sanitizedRes;
        });
    }

    // Fully concurrent execution of cache retrieval and dynamic DB querying
    const [formattedMyClubs, allClubs] = await Promise.all([
        fetchMyClubsPromise(),
        allClubsPromise
    ]);

    const nextCursor = allClubs.length === limit ? allClubs[allClubs.length - 1].id : null;

    res.json({ my: formattedMyClubs, all: allClubs, nextCursor });
  } catch (error) {
    console.error('Error fetching clubs:', error);
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
});

// Get club details
router.get('/:id', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const club = await (prisma as any).club.findUnique({
      where: { id },
      include: {
        owner: { select: { nickname: true, profileImageUrl: true, id: true } },
        _count: { select: { members: true, posts: true } },
        members: {
          take: 10,
          include: { user: { select: { nickname: true, profileImageUrl: true, id: true } } }
        }
      }
    });

    if (!club) return res.status(404).json({ error: 'Club not found' });

    // Check membership status
    let membership = null;
    let isBookmarked = null;
    if (userId) {
      membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: id, userId } }
      });

      isBookmarked = await prisma.clubBookmark.findUnique({
        where: { clubId_userId: { clubId: id, userId } }
      });
    }

    res.json({ ...club, myMembership: membership, isBookmarked: !!isBookmarked });
  } catch (error) {
    console.error('Error fetching club details:', error);
    res.status(500).json({ error: 'Failed to fetch club details' });
  }
});

// Soft Delete a club (Disband)
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const club = await (prisma as any).club.findUnique({
      where: { id },
      select: { ownerId: true }
    });

    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the club owner can delete the club' });
    }

    await (prisma as any).club.update({
      where: { id },
      data: { isDeleted: true }
    });

    res.json({ message: 'Club deleted successfully' });
  } catch (error) {
    console.error('Error soft-deleting club:', error);
    res.status(500).json({ error: 'Failed to delete club' });
  }
});

// Completely hide a deleted club from owner's list
router.post('/:id/hide', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Remove user's membership and bookmarks so it drops from uniqueMyClubIds
    await prisma.clubMember.deleteMany({
      where: { clubId: id, userId }
    });
    
    await prisma.clubBookmark.deleteMany({
      where: { clubId: id, userId }
    });

    res.json({ message: 'Club hidden from the list' });
  } catch (error) {
    console.error('Error hiding club:', error);
    res.status(500).json({ error: 'Failed to hide club' });
  }
});

// Edit club description
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { description, coverImageUrl, locationName, lat, lng, isPrivate } = req.body;

    const myMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } }
    });

    if (!myMembership || myMembership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only club owner can edit details' });
    }

    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (locationName !== undefined) updateData.locationName = locationName;
    if (lat !== undefined) updateData.lat = lat ? parseFloat(lat) : null;
    if (lng !== undefined) updateData.lng = lng ? parseFloat(lng) : null;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

    let finalCoverImageUrl = coverImageUrl;
    if (finalCoverImageUrl) {
      let imagesToProcess: string[] = [];
      let isJsonArray = false;
      
      if (finalCoverImageUrl.startsWith('[')) {
          try {
              imagesToProcess = JSON.parse(finalCoverImageUrl);
              isJsonArray = true;
          } catch (e) {
              console.log('Failed to parse coverImageUrl JSON array');
          }
      } else if (finalCoverImageUrl.startsWith('data:image')) {
          imagesToProcess = [finalCoverImageUrl];
      }

      if (imagesToProcess.length > 0) {
          const newPaths: string[] = [];
          for (let i = 0; i < imagesToProcess.length; i++) {
              const imgData = imagesToProcess[i];
              if (imgData.startsWith('data:image')) {
                  const base64MimeType = imgData.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';
                  const extension = base64MimeType.split('/')[1] || 'jpg';
                  const base64Data = imgData.split(';base64,').pop();

                  if (base64Data) {
                      const fileName = `club_${Date.now()}_${Math.floor(Math.random() * 1000)}_${i}.${extension}`;
                      const relativeDir = path.join('clubs', userId);
                      const uploadPath = path.join(process.cwd(), 'uploads', relativeDir);
                      
                      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

                      fs.writeFileSync(path.join(uploadPath, fileName), base64Data, { encoding: 'base64' });
                      newPaths.push(`/uploads/${relativeDir.split(path.sep).join('/')}/${fileName}`);
                  }
              } else {
                  newPaths.push(imgData); // Keep existing URLs if any
              }
          }
          finalCoverImageUrl = isJsonArray || newPaths.length > 1 ? JSON.stringify(newPaths) : newPaths[0];
      }
    }
    
    if (finalCoverImageUrl !== undefined) updateData.coverImageUrl = finalCoverImageUrl;

    const updatedClub = await (prisma as any).club.update({
      where: { id },
      data: updateData
    });

    res.json(updatedClub);
  } catch (error) {
    console.error('Error updating club:', error);
    res.status(500).json({ error: 'Failed to update club' });
  }
});

// Toggle bookmark
router.post('/:id/bookmark', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.clubBookmark.findUnique({
      where: { clubId_userId: { clubId: id, userId } }
    });

    if (existing) {
      await prisma.clubBookmark.delete({ where: { id: existing.id } });
      res.json({ bookmarked: false });
    } else {
      await prisma.clubBookmark.create({
        data: { clubId: id, userId }
      });
      res.json({ bookmarked: true });
    }
  } catch (error) {
    console.error('Error toggling club bookmark:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// Join/Leave club
router.post('/:id/join', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { applicationData } = req.body || {};

    const club = await (prisma as any).club.findUnique({ 
      where: { id },
      include: { owner: { select: { email: true } } }
    });
    if (!club) return res.status(404).json({ error: 'Club not found' });

    const existing = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } }
    });

    if (existing) {
      // Leave club OR CANCEL Request (if pending or member)
      if (existing.role === 'OWNER') return res.status(400).json({ error: 'Owner cannot leave club' });
      await prisma.clubMember.delete({ where: { id: existing.id } });
      const updateData: any = { leftCount: { increment: 1 } };
      if (existing.role !== 'PENDING') {
          updateData.memberCount = { decrement: 1 };
      }
      await (prisma as any).club.update({ where: { id }, data: updateData });
      return res.json({ status: 'LEFT' });
    }

    // Join club
    if (!club.isRecruiting) {
      return res.status(400).json({ error: 'This club is no longer recruiting.' });
    }
    const role = 'PENDING'; // All joins require approval now
    const newMember = await prisma.clubMember.create({
      data: {
        clubId: id,
        userId,
        role,
        applicationData: applicationData ? JSON.stringify(applicationData) : null
      }
    });

    // Notify owner
    const applicant = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    if (club.owner && club.owner.email && applicant) {
        sendClubApplicationNotification(club.owner.email, club.name, applicant.nickname).catch(console.error);
    }

    res.json({ status: role, member: newMember, joinedAt: newMember.joinedAt });
  } catch (error) {
    console.error('Error joining club:', error);
    res.status(500).json({ error: 'Failed to join club' });
  }
});
// Get members of a club
router.get('/:id/members', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify req.user access
    const myMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } }
    });

    const isManager = myMembership && (myMembership.role === 'OWNER' || myMembership.role === 'ADMIN');

    // Only fetch PENDING if isManager
    let rolesToFetch: any[] = ['OWNER', 'ADMIN', 'EVENT_MANAGER', 'CONTENT_MANAGER', 'MEMBER', 'NEWBIE'];
    if (isManager) {
      rolesToFetch.push('PENDING');
    }

    const members = await prisma.clubMember.findMany({
      where: { 
        clubId: id,
        role: { in: rolesToFetch }
      },
      include: {
        user: { select: { id: true, nickname: true, profileImageUrl: true } }
      },
      orderBy: [
        { role: 'asc' }, // usually alphabetical but OK
        { joinedAt: 'desc' }
      ]
    });

    res.json({ members, isManager });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Manage members (approve, kick, etc)
router.put('/:id/members/:targetUserId', authenticateToken, async (req: any, res) => {
  try {
    const { id, targetUserId } = req.params;
    const { action } = req.body; // 'APPROVE', 'KICK', 'PROMOTE'
    const userId = req.user.id;

    // Check my role
    const myMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } }
    });

    if (!myMembership || (myMembership.role !== 'OWNER' && myMembership.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const targetMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: targetUserId } }
    });

    if (!targetMembership) return res.status(404).json({ error: 'Member not found' });

    if (action === 'APPROVE' && targetMembership.role === 'PENDING') {
      await prisma.clubMember.update({
        where: { id: targetMembership.id },
        data: { role: 'MEMBER' }
      });
      await (prisma as any).club.update({ where: { id }, data: { memberCount: { increment: 1 } } });
      
      const clubInfo = await (prisma as any).club.findUnique({ where: { id } });
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { email: true } });
      if (clubInfo && targetUser && targetUser.email) {
          sendClubApprovalNotification(targetUser.email, clubInfo.name).catch(console.error);
      }
    } else if (action === 'KICK') {
      if (targetMembership.role === 'OWNER') return res.status(400).json({ error: 'Cannot kick owner' });
      const updateData: any = { leftCount: { increment: 1 } };
      if (targetMembership.role !== 'PENDING') {
          updateData.memberCount = { decrement: 1 };
      }
      await prisma.clubMember.delete({ where: { id: targetMembership.id } });
      await (prisma as any).club.update({ where: { id }, data: updateData });
    } else if (action === 'UPDATE_ROLE') {
      if (targetMembership.role === 'OWNER' && req.body.role !== 'OWNER') return res.status(400).json({ error: 'Cannot demote owner' });
      if (myMembership.role !== 'OWNER' && req.body.role === 'ADMIN') return res.status(403).json({ error: 'Only owner can assign admins' });
      
      await prisma.clubMember.update({
        where: { id: targetMembership.id },
        data: { role: req.body.role }
      });
    } else if (action === 'UPDATE_BADGES') {
      await prisma.clubMember.update({
        where: { id: targetMembership.id },
        data: { badges: req.body.badges ? JSON.stringify(req.body.badges) : null }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error managing club member:', error);
    res.status(500).json({ error: 'Failed to manage member' });
  }
});

// Toggle Recruitment Status
router.put('/:id/recruitment', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { isRecruiting, recruitDeadline } = req.body;

    const existing = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } }
    });

    if (!existing || (existing.role !== 'OWNER' && existing.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only admins can toggle recruitment status' });
    }

    const updated = await (prisma as any).club.update({
      where: { id },
      data: {
        isRecruiting: typeof isRecruiting === 'boolean' ? isRecruiting : undefined,
        recruitDeadline: recruitDeadline ? new Date(recruitDeadline) : null
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling recruitment:', error);
    res.status(500).json({ error: 'Failed to update recruitment status' });
  }
});

export default router;
