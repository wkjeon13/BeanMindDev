import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Heart, MessageCircle, MapPin, Share2 } from 'lucide-react-native';
import { API_BASE } from '../../utils/apiConfig';
import { getItem } from '../../utils/storage';

interface Post {
  id: string;
  author: { id: string; name: string; avatar: string; badges: string[] };
  image: string;
  content: string;
  cafeName?: string;
  cafeLocation?: string;
  likes: number;
  comments: number;
  timeAgo: string;
}

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchFeed = async () => {
    try {
      const token = await getItem('token');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/community/posts`, { headers });
      
      if (res.ok) {
        const data = await res.json();
        const mappedPosts = data.map((d: any) => {
            let imageStr = '';
            if (d.images && d.images.length > 0) {
                imageStr = d.images[0].url;
            }
            return {
                id: d.id,
                author: {
                    id: d.author?.id || 'unknown',
                    name: d.author?.name || 'User',
                    avatar: d.author?.profileImage || '',
                    badges: d.author?.role === 'HOST' ? ['OWNER'] : [],
                },
                image: imageStr,
                content: d.content,
                cafeName: d.store?.name,
                cafeLocation: d.store?.address,
                likes: d._count?.likes || 0,
                comments: d._count?.comments || 0,
                timeAgo: new Date(d.createdAt || Date.now()).toLocaleDateString(),
            };
        });
        setPosts(mappedPosts);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const renderPost = ({ item }: { item: Post }) => {
    let imageUrl = item.image;
    try {
      const parsed = JSON.parse(item.image);
      if (Array.isArray(parsed)) imageUrl = parsed[0];
    } catch(e) {}

    // Ensure image URL is absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${API_BASE}${imageUrl}`;
    }

    const avatarUrl = item.author.avatar?.startsWith('http') ? item.author.avatar : `${API_BASE}${item.author.avatar}`;

    return (
      <View className="bg-[#1c1a19] border border-espresso-700/50 rounded-3xl mb-6 mx-4 overflow-hidden shadow-lg shadow-black/50">
        {/* Header */}
        <View className="flex-row items-center p-4">
           {item.author.avatar ? (
             <Image source={{ uri: avatarUrl }} className="w-10 h-10 rounded-full border border-espresso-700" />
           ) : (
             <View className="w-10 h-10 rounded-full bg-espresso-800 items-center justify-center border border-espresso-700">
               <Text className="text-espresso-300 font-bold">{item.author.name.charAt(0)}</Text>
             </View>
           )}
           <View className="ml-3 flex-1">
              <View className="flex-row items-center gap-1.5">
                  <Text className="font-bold text-espresso-50">{item.author.name}</Text>
                  {item.author.badges?.includes('OWNER') && (
                     <View className="bg-amber-900/40 border border-amber-600 px-1.5 py-0.5 rounded">
                         <Text className="text-[10px] text-amber-500 font-bold">사장님</Text>
                     </View>
                  )}
              </View>
              <Text className="text-xs text-espresso-300 mt-0.5">{item.timeAgo}</Text>
           </View>
        </View>

        {/* Media */}
        {imageUrl && (
            <View className="w-full aspect-square relative bg-espresso-950">
                <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
                
                {item.cafeName && (
                  <View className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md rounded-2xl p-3 flex-row items-center gap-2 border border-white/10">
                    <MapPin size={16} color="#fbbf24" />
                    <View>
                        <Text className="text-xs font-bold text-white">{item.cafeName}</Text>
                        <Text className="text-[10px] text-zinc-300">{item.cafeLocation}</Text>
                    </View>
                  </View>
                )}
            </View>
        )}

        {/* Interactions */}
        <View className="p-4 flex-row items-center gap-4">
           <TouchableOpacity className="flex-row items-center gap-1.5">
               <Heart size={24} color="#f5f4f2" />
               <Text className="text-espresso-50 font-bold">{item.likes}</Text>
           </TouchableOpacity>
           <TouchableOpacity className="flex-row items-center gap-1.5">
               <MessageCircle size={24} color="#f5f4f2" />
               <Text className="text-espresso-50 font-bold">{item.comments}</Text>
           </TouchableOpacity>
           <View className="flex-1" />
           <TouchableOpacity>
               <Share2 size={24} color="#f5f4f2" />
           </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="px-4 pb-4">
            <Text className="text-espresso-100 text-[14px] leading-relaxed" numberOfLines={3}>
                <Text className="font-bold text-espresso-50">{item.author.name}</Text>
                {' '} {item.content}
            </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-espresso-950 pt-12">
      <View className="px-5 pb-4">
         <Text className="text-2xl font-serif font-bold text-amber-500">Coffee Talk ☕</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <FlatList
            data={posts}
            keyExtractor={item => item.id}
            renderItem={renderPost}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}
